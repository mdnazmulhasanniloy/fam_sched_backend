const generateCryptoString = (
  length: number,
  startWith: string = '#',
): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(length);

  crypto.getRandomValues(array);

  const randomString = Array.from(
    array,
    byte => chars[byte % chars.length],
  ).join('');

  return `${startWith}${randomString}`;
};

export default generateCryptoString;
