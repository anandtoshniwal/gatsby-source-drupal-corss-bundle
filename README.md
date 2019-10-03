# gatsby-source-drupal-cross-bundle

Source plugin for pulling data (including images) into Gatsby from Drupal sites.

Pulls data from Drupal 8 sites with the
[Drupal JSONAPI](https://www.drupal.org/project/jsonapi) and [JSON:API Cross Bundles](https://www.drupal.org/project/jsonapi_cross_bundles) modules installed.

`apiBase` Option allows changing the API entry point depending on the version of
jsonapi used by your Drupal instance. The default value is `jsonapi`, which has
been used since jsonapi version `8.x-1.0-alpha4`.

## Install

`npm install --save gatsby-source-drupal-cross-bundle`

## How to use

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-drupal-cross-bundle`,
      options: {
        baseUrl: `http://commerce.local`,
        apiBase: `api`, // optional, defaults to `jsonapi`
      },
    },
  ],
}
```
