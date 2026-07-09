// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    { type: 'html', value: 'Guides', className: 'sidebar-heading' },
    'getting-started',
    'angular',
    'custom-edges',
    'layout',
    'export',
    'theming',
    'accessibility',
    'migration',
    { type: 'html', value: 'Reference', className: 'sidebar-heading' },
    'core-api',
  ],
};

module.exports = sidebars;
