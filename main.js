  const { Firestore } = require('@google-cloud/firestore');

  function getDefault(id) {
    return {
      id,
      faqs_count: 0,
      last_faq_modified: null,
      blacklist_keywords: 0,
      blacklist_categories: 0,
    }
  }

  async function getData() {
    const firestore = new Firestore({
      projectId: 'pms-staging-firestore',
      keyFilename: '.credentials-firestore.json'
    });

    const collectionsFaq = await firestore.collection('pms-faq.Faqs').listDocuments();
    const collectionFaqIds = collectionsFaq.map(col => col.id);

    const info = {};
    await Promise.all(collectionFaqIds.map(async (id) => {
      const tmpRefColl = firestore.collection(`pms-faq.Faqs/${id}/faqs`);
      const len = await tmpRefColl.where('deleted', '==', null).get();
      const modifiedRef = await tmpRefColl.orderBy("modified", 'desc').limit(1).get();
      const modifiedData = !modifiedRef.empty ? modifiedRef.docs[0].data() : false;
      if (!info[id]) {
        info[id] = getDefault(id);
      }
      info[id]['faqs_count'] = len.docs.length;
      info[id]['last_faq_modified'] = modifiedData
        ? (new Date(modifiedData.modified.toDate())).toISOString()
          .replace(/T/, ' ')
          .replace(/\..+/, '')
        : false;
    }));

    const collectionsBLCats = await firestore
      .collection('pms-blacklist.CategoryBlacklist')
      .listDocuments();
    const collectionBLCatsIds = collectionsBLCats.map(col => col.id);

    await Promise.all(collectionBLCatsIds.map(async (id) => {
      const tmpRefColl = firestore
        .collection(`pms-blacklist.CategoryBlacklist/${id}/configurations`);
      const len = await tmpRefColl
        .where('isActive', '==', true)
        .get();
      if (!info[id]) {
        info[id] = getDefault(id);
      }
      info[id]['blacklist_categories'] = len.docs.length;
    }));

    const collectionsBLKeys = await firestore
      .collection('pms-blacklist.KeywordBlacklist')
      .listDocuments();
    const collectionBLKeysIds = collectionsBLKeys.map(col => col.id);

    await Promise.all(collectionBLKeysIds.map(async (id) => {
      const tmpRefColl = firestore
        .collection(`pms-blacklist.KeywordBlacklist/${id}/configurations`);
      const len = await tmpRefColl
        .where('isActive', '==', true)
        .get();
      if (!info[id]) {
        info[id] = getDefault(id);
      }
      info[id]['blacklist_keywords'] = len.docs.length;
    }));

    return info;
  }

(async () => {
  try {
    const data = await getData();
    console.log('platform_id,faqs_count,last_faq_modified,blacklist_categories,blacklist_keywords');
    Object.keys(data).map(key => {
      console.log(
        [
          data[key].id,
          data[key].faqs_count,
          data[key].last_faq_modified,
          data[key].blacklist_keywords,
          data[key].blacklist_categories
        ].join(),
      );
    });
  } catch (e) {
    console.error(e);
  }
})();

