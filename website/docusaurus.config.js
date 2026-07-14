// @ts-check
const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'nodeweave',
  tagline: 'A framework-agnostic node / graph canvas',
  favicon: 'img/favicon.svg',

  url: 'https://elisco-latour.github.io',
  baseUrl: '/nodeweave/',

  organizationName: 'elisco-latour',
  projectName: 'nodeweave',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'nodeweave',
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
          { to: '/docs/getting-started', label: 'Getting started', position: 'left' },
          { to: '/docs/angular', label: 'Angular', position: 'left' },
          { href: 'https://github.com/elisco-latour/nodeweave', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Getting started', to: '/docs/getting-started' },
              { label: 'Angular', to: '/docs/angular' },
              { label: 'Core API', to: '/docs/core-api' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'Theming', to: '/docs/theming' },
              { label: 'Coming from React Flow', to: '/docs/migration' },
            ],
          },
        ],
        copyright: 'nodeweave · ISC',
      },
      prism: {
        theme: themes.vsDark,
        darkTheme: themes.vsDark,
      },
    }),
};

module.exports = config;
