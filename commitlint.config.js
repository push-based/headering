// Commit subjects are short imperative sentences, like "Add pause all to the popup".
// Conventional Commits prefixes such as "feat:" aren't used.
export default {
  rules: {
    'header-max-length': [2, 'always', 72],
    'header-min-length': [2, 'always', 10],
    'header-case': [2, 'always', 'sentence-case'],
    'header-full-stop': [2, 'never', '.'],
    'header-trim': [2, 'always'],
    'type-empty': [2, 'always'],
    'scope-empty': [2, 'always'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
