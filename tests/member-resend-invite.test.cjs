const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const servicePath = path.resolve('src/app/modules/member/member.service.ts');
const source = ts.transpileModule(fs.readFileSync(servicePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function setup() {
  const state = {
    member: { user: 'owner', member: 'recipient' },
    recipient: {
      _id: 'recipient',
      name: 'Member',
      email: 'member@example.com',
      password: 'old-hash',
      needsPasswordChange: true,
      isDeleted: false,
      temporaryPasswordExpiresAt: new Date(Date.now() - 1000),
    },
    updates: [],
    mails: [],
    rollbacks: [],
    conflict: false,
    mailError: false,
  };
  const User = {
    findById: id =>
      id === 'recipient'
        ? { select: async () => state.recipient }
        : Promise.resolve({ name: 'Owner' }),
    findOneAndUpdate: async (...args) => {
      state.updates.push(args);
      return state.conflict ? null : {};
    },
    updateOne: async (...args) => {
      state.rollbacks.push(args);
    },
  };
  class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  const mocks = {
    'http-status': {
      BAD_REQUEST: 400,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      CONFLICT: 409,
    },
    './member.models': { findById: async () => state.member },
    '../../error/AppError': AppError,
    '../user/user.models': { User },
    '../user/user.constants': {
      USER_ROLE: {
        user: 'user',
        worker: 'worker',
        admin: 'admin',
        super_admin: 'super_admin',
        sub_admin: 'sub_admin',
      },
    },
    '../../utils/mailSender': {
      sendEmail: async (...args) => {
        if (state.mailError) throw new Error('SMTP failed');
        state.mails.push(args);
      },
    },
    '../../utils/generateCryptoString': () => '#NEWPASS',
    '../../config': { bcrypt_salt_rounds: 10 },
    bcrypt: { hash: async value => `hashed:${value}` },
    mongoose: { isValidObjectId: id => id === 'valid-id' },
    fs,
    path,
  };
  const context = {
    exports: {},
    require: name => mocks[name] || {},
    Date,
    __dirname: path.dirname(servicePath),
  };
  vm.runInNewContext(source, context);
  return { state, resend: context.exports.memberService.resendInvite };
}

test('owner and admins resend expired invites with hashed passwords and 48-hour expiry', async () => {
  for (const [actor, role] of [
    ['owner', 'user'],
    ['owner', 'worker'],
    ['other', 'admin'],
    ['other', 'super_admin'],
    ['other', 'sub_admin'],
  ]) {
    const { state, resend } = setup();
    const before = Date.now();
    const result = await resend('valid-id', actor, role);
    const after = Date.now();
    assert.ok(
      result.temporaryPasswordExpiresAt.getTime() >= before + 48 * 3600000,
    );
    assert.ok(
      result.temporaryPasswordExpiresAt.getTime() <= after + 48 * 3600000,
    );
    assert.equal(result.email, 'member@example.com');
    assert.equal(result.password, undefined);
    const [filter, update] = state.updates[0];
    assert.equal(filter.password, 'old-hash');
    assert.equal(filter.needsPasswordChange, true);
    assert.ok(filter.temporaryPasswordExpiresAt.$lte instanceof Date);
    assert.equal(update.$set.password, 'hashed:#NEWPASS');
    assert.equal(state.mails[0][0], 'member@example.com');
    assert.ok(state.mails[0][2].includes('#NEWPASS'));
    assert.ok(!state.mails[0][2].includes('{{temporaryPassword}}'));
  }
});

test('unrelated owners cannot resend', async () => {
  const { state, resend } = setup();
  await assert.rejects(resend('valid-id', 'other', 'user'), {
    statusCode: 403,
  });
  assert.equal(state.updates.length, 0);
  assert.equal(state.mails.length, 0);
});

test('invalid and missing member IDs are rejected', async () => {
  const { state, resend } = setup();
  await assert.rejects(resend('invalid', 'owner', 'user'), { statusCode: 400 });
  state.member = null;
  await assert.rejects(resend('valid-id', 'owner', 'user'), {
    statusCode: 404,
  });
});

test('active invites, changed passwords and non-invited accounts cannot be overwritten', async () => {
  for (const changes of [
    { temporaryPasswordExpiresAt: new Date(Date.now() + 60000) },
    { needsPasswordChange: false },
    { temporaryPasswordExpiresAt: null },
  ]) {
    const { state, resend } = setup();
    Object.assign(state.recipient, changes);
    await assert.rejects(resend('valid-id', 'owner', 'user'), {
      statusCode: 400,
    });
    assert.equal(state.updates.length, 0);
    assert.equal(state.mails.length, 0);
  }
});

test('deleted or missing recipients cannot receive invites', async () => {
  for (const recipient of [null, { isDeleted: true }]) {
    const { state, resend } = setup();
    state.recipient = recipient;
    await assert.rejects(resend('valid-id', 'owner', 'user'), {
      statusCode: 404,
    });
    assert.equal(state.updates.length, 0);
  }
});

test('concurrent credential changes prevent sending stale invites', async () => {
  const { state, resend } = setup();
  state.conflict = true;
  await assert.rejects(resend('valid-id', 'owner', 'user'), {
    statusCode: 409,
  });
  assert.equal(state.mails.length, 0);
});

test('mail failure conditionally restores the previous credentials for retry', async () => {
  const { state, resend } = setup();
  state.mailError = true;
  await assert.rejects(resend('valid-id', 'owner', 'user'), /SMTP failed/);
  assert.equal(state.rollbacks.length, 1);
  const [filter, update] = state.rollbacks[0];
  assert.equal(filter.password, 'hashed:#NEWPASS');
  assert.equal(
    filter.temporaryPasswordExpiresAt,
    state.updates[0][1].$set.temporaryPasswordExpiresAt,
  );
  assert.equal(update.$set.password, 'old-hash');
  assert.equal(
    update.$set.temporaryPasswordExpiresAt,
    state.recipient.temporaryPasswordExpiresAt,
  );
});
