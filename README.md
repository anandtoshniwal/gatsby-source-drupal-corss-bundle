# gatsby-source-drupal-cross-bundle

source plugin for pulling data provided by [JSON:API Cross Bundles modules](https://www.drupal.org/project/jsonapi_cross_bundles). This module provides all the bundles data under it's entity type Which will helps to build listing pages more easily and smiplifies more other queries where data required from more than one resource.

`apiBase` Option allows changing the API entry point depending on the version of
jsonapi used by your Drupal instance. The default value is `jsonapi`, which has been used since jsonapi version `8.x-1.0-alpha4`.

## Installing gatsby-source-drupal-cross-bundle

`npm install --save gatsby-source-drupal-cross-bundle`

## How to use

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-drupal-cross-bundle`,
      options: {
        baseUrl: `http://example.com/`, //example baseUrl
        apiBase: `api`, // optional, defaults to `jsonapi`
      },
    },
  ],
}
```
## How to query it
```graphql
{
  allNodeNode {
    nodes {
      title
      drupal_type
    }
  }
}
```
