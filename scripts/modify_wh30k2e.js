
let titleCase = function(sentence){
  return sentence.replace(/^\s*(.*[^\s])*\s*$/,'$1').replace(/\s+/g,' ').toLowerCase().split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ').replace(/ Of /g,' of ').replace(/ The /g,' the ').replace(/ With /g,' with ').replace(/ In /g,' in ').replace(/ On /g,' on ').replace(/ Of /g,' of ').replace(/ And /g,' and ')
}

const fileList = [
  '30kHorusHeresy_Core.rulebook'
];
async function processFiles() {
  for (const file of fileList) {
    try {
      const response = await fetch('../' + file);
      const rulebook = await response.json();

      let assetLists = {};

      Object.keys(rulebook.rulebook.assetCatalog).forEach(itemKey => {
        let [itemClass, itemDesignation] = itemKey.split('§');
        assetLists[itemDesignation] = assetLists[itemDesignation] || [];
        assetLists[itemDesignation].push(itemKey);
      });

      console.log(assetLists);

      let removalList = new Set();
      Object.keys(rulebook.rulebook.assetCatalog).forEach(itemKey => {
        let [itemClass, itemDesignation] = itemKey.split('§');
        let item = rulebook.rulebook.assetCatalog[itemKey];

        // traitify stat ranks
        // Object.keys(item.stats || {}).forEach(statKey => {
        //   let stat = item.stats[statKey];
        //   Object.keys(stat.ranks || {}).forEach(statRankKey => {
            
        //   });
        // });

        // what are selection entries? groups?
        item.assets?.traits?.forEach((trait,i,a) => {
          let [traitClass, traitDesignation] = typeof trait === 'string' ? trait.split('§') : trait.item.split('§');
          if(traitClass.includes('SelectionEntry') && assetLists[traitDesignation]?.length){
            console.log(itemKey, JSON.parse(JSON.stringify(item)));
            a[i] = assetLists[traitDesignation][0];
            console.log(itemKey, JSON.parse(JSON.stringify(item)));
          }
        });

      });
      removalList.forEach(itemKey => {
        delete rulebook.rulebook.assetCatalog[itemKey];
      });


      // alphabetize rulebook.rulebook.assetCatalog by key name
      rulebook.rulebook.assetCatalog = Object.keys(rulebook.rulebook.assetCatalog).sort().reduce((obj, key) => {
        obj[key] = rulebook.rulebook.assetCatalog[key];
        return obj;
      }, {});

      console.log(rulebook.name, rulebook);
    } catch (error) {
      // Handle any error that occurs during loading
      console.error(error);
    }
  }
}

processFiles();

function replaceStringsInObject(obj, searchString, replaceString) {
  // Base case: if the object is a string, replace the search string with the replace string
  if (typeof obj === 'string' && obj === searchString) {
    return replaceString;
  }

  // Recursive case: if the object is an array or an object, iterate over its properties
  if (Array.isArray(obj)) {
    return obj.map(element => replaceStringsInObject(element, searchString, replaceString));
  }

  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (let key in obj) {
      newObj[key] = replaceStringsInObject(obj[key], searchString, replaceString);
    }
    return newObj;
  }

  // If the object is neither a string, an array, nor an object, return it as is
  return obj;
}