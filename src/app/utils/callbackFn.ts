type CallbackArgs<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const callbackFn = <T = unknown>(
  callback: (args: CallbackArgs<T>) => void,
  result: CallbackArgs<T>,
) => {
  if (typeof callback === 'function') {
    callback(result);
  }
};
export default callbackFn;
