import { DB } from '../app/api/odm';
import request from '../app/shared/JSONRequest';
import elasticMapping from './elastic_mapping';

import { search } from '../app/api/search';
import { tenants } from '../app/api/odm/tenantContext.ts';

DB.connect().then(() => {
  tenants.run(async () => {
    let docsIndexed = 0;
    let pos = 0;
    const spinner = ['|', '/', '-', '\\'];

    function indexEntities() {
      return search.indexEntities({}, '+fullText', 50, indexed => {
        process.stdout.write(
          `Indexing documents and entities... ${spinner[pos]} - ${docsIndexed} indexed\r`
        );
        pos = (pos + 1) % 4;
        docsIndexed += indexed;
      });
    }

    const start = Date.now();
    const { indexName } = tenants.current();
    process.stdout.write(`Deleting index... ${indexName}\n`);
    const elasticUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    const indexUrl = `${elasticUrl}/${indexName}`;
    request
      .delete(indexUrl)
      .catch(console.log)
      .then(() => {
        process.stdout.write(`Creating index... ${indexName}\n`);
        return request.put(indexUrl, elasticMapping).catch(console.log);
      })
      .then(() => indexEntities())
      .then(() => {
        process.stdout.write(`Indexing documents and entities... - ${docsIndexed} indexed\r\n`);
      })
      .then(() => {
        const end = Date.now();
        process.stdout.write(`Done, took ${(end - start) / 1000} seconds\n`);
        return DB.disconnect();
      })
      .catch(error => {
        console.log('Indexing error: ', error);
        process.exit(1);
      });
  });
});
