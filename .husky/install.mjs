// Skip Husky install in production and CI
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  console.log('🐶 Skipping Husky install in production or CI ');
  process.exit(0);
}

const husky = (await import('husky')).default;

const huskyOutput = husky();
if (huskyOutput) {
  console.log(huskyOutput);
}

console.log('🐶 Husky installed successfully, woof woof!');
