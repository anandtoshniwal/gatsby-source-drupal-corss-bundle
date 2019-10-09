"use strict";

const axios = require(`axios`);

const _ = require(`lodash`);

const {
  nodeFromData,
  downloadFile,
  isFileNode
} = require(`./normalize`);

const {
  handleReferences,
  handleWebhookUpdate
} = require(`./utils`);

const asyncPool = require(`tiny-async-pool`);

const bodyParser = require(`body-parser`);

// Checking if gatsby-source-drupal is installed or not.
let gatsbySourceDrupal = false;
try {
  require.resolve("gatsby-source-drupal");
} catch(e) {
  if (e.code === 'MODULE_NOT_FOUND') gatsbySourceDrupal = true;
}

exports.sourceNodes = async ({
  actions,
  store,
  cache,
  createNodeId,
  createContentDigest,
  reporter
}, pluginOptions) => {
  let {
    baseUrl,
    apiBase,
    basicAuth,
    filters,
    headers,
    params,
    concurrentFileRequests
  } = pluginOptions;
  const {
    createNode
  } = actions;
  const drupalFetchActivity = reporter.activityTimer(`Fetch data from Drupal`); // Default apiBase to `jsonapi`

  apiBase = apiBase || `jsonapi`; // Default concurrentFileRequests to `20`

  concurrentFileRequests = concurrentFileRequests || 20; // Touch existing Drupal nodes so Gatsby doesn't garbage collect them.
  // _.values(store.getState().nodes)
  // .filter(n => n.internal.type.slice(0, 8) === `drupal__`)
  // .forEach(n => touchNode({ nodeId: n.id }))
  // Fetch articles.
  // console.time(`fetch Drupal data`)

  reporter.info(`Starting to fetch data from Drupal`); // TODO restore this
  // let lastFetched
  // if (
  // store.getState().status.plugins &&
  // store.getState().status.plugins[`gatsby-source-drupal`]
  // ) {
  // lastFetched = store.getState().status.plugins[`gatsby-source-drupal`].status
  // .lastFetched
  // }

  drupalFetchActivity.start();
  const data = await axios.get(`${baseUrl}/${apiBase}`, {
    auth: basicAuth,
    headers,
    params
  });

  const allData = await Promise.all(_.map(data.data.links, async (url, type) => {
    if (type === `self`) return;
    if (!url) return;
    if (!type) return;
    
    if( url.href != `${baseUrl}${apiBase}/user/user` || !gatsbySourceDrupal) {
      if (new URL(url.href).pathname.split('/').length != 3) return;
    }

    const getNext = async (url, data = []) => {
      if (typeof url === `object`) {
        // url can be string or object containing href field
        url = url.href; // Apply any filters configured in gatsby-config.js. Filters
        // can be any valid JSON API filter query string.
        // See https://www.drupal.org/docs/8/modules/jsonapi/filtering

        if (typeof filters === `object`) {
          if (filters.hasOwnProperty(type)) {
            url = url + `?${filters[type]}`;
          }
        }
      }

      let d;

      try {
        d = await axios.get(url, {
          auth: basicAuth,
          headers,
          params
        });
      } catch (error) {
        if (error.response && error.response.status == 405) {
          // The endpoint doesn't support the GET method, so just skip it.
          return [];
        } else {
          console.error(`Failed to fetch ${url}`, error.message);
          console.log(error.data);
          throw error;
        }
      }

      data = data.concat(d.data.data);

      if (d.data.links.next) {
        data = await getNext(d.data.links.next, data);
      }

      return data;
    };

    const data = await getNext(url);
    const result = {
      type,
      data // eslint-disable-next-line consistent-return

    };
    return result;
  }));
  drupalFetchActivity.end();
  const nodes = new Map(); // first pass - create basic nodes

  _.each(allData, contentType => {
   if (!contentType) return;   
   
   // flag for creating new id with commerce_prodcut as prefix 
   //so that it will be differ from the previously created node id
   let flag = false;
    _.each(contentType.data, datum => {
      // checking if the nodes of current type already exists
      // if yes then checking that parent type and current node type has different id
      // assumption all the content type has same parent type and type with each content is same
      // if that differs then assign the parent type to content.. we can't create the same type
      if(datum.type == 'user--user' || !gatsbySourceDrupal) {
        const node = nodeFromData(datum, createNodeId);
        nodes.set(node.id, node);
      }
      if(datum.type != contentType.type ) {
          datum.drupal_type = `cross_bundle--${datum.type}`
          datum.type = contentType.type
          const node = nodeFromData(datum, createNodeId);
          nodes.set(node.id, node);
      }
    });
  }); // second pass - handle relationships and back references

  nodes.forEach(node => {
    handleReferences(node, {
      getNode: nodes.get.bind(nodes),   
      createNodeId
    });
  });
  reporter.info(`Downloading remote files from Drupal`); // Download all files (await for each pool to complete to fix concurrency issues)

  const fileNodes = [...nodes.values()].filter(isFileNode);

  if (fileNodes.length) {
    const downloadingFilesActivity = reporter.activityTimer(`Remote file download`);
    downloadingFilesActivity.start();
    await asyncPool(concurrentFileRequests, fileNodes, async node => {
      await downloadFile({
        node,
        store,
        cache,
        createNode,
        createNodeId
      }, pluginOptions);
    });
    downloadingFilesActivity.end();
  } // Create each node


  for (const node of nodes.values()) {
    node.internal.contentDigest = createContentDigest(node);
    createNode(node);
  }
};

exports.onCreateDevServer = ({
  app,
  createNodeId,
  getNode,
  actions,
  store,
  cache,
  createContentDigest,
  reporter
}, pluginOptions) => {
  app.use(`/___updatePreview/`, bodyParser.text({
    type: `application/json`
  }), async (req, res) => {
    // we are missing handling of node deletion
    const nodeToUpdate = JSON.parse(JSON.parse(req.body)).data;
    await handleWebhookUpdate({
      nodeToUpdate,
      actions,
      cache,
      createNodeId,
      createContentDigest,
      getNode,
      reporter,
      store
    }, pluginOptions);
  });
};