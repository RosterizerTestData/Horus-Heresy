
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
        assetLists[itemDesignation.toLowerCase()] = assetLists[itemDesignation.toLowerCase()] || [];
        assetLists[itemDesignation.toLowerCase()].push(itemKey);
      });

      console.log(assetLists);
      Object.keys(assetLists).forEach(itemDesignation => {
        if(assetLists[itemDesignation.toLowerCase()].length > 1){
          let itemKey = assetLists[itemDesignation][0];
          let itemClass = itemKey.split('§')[0];
          let item = rulebook.rulebook.assetCatalog[itemKey];
        }
      });

      let removalList = new Set();
      let classList = new Set();
      Object.keys(rulebook.rulebook.assetCatalog).forEach(itemKey => {
        let [itemClass, itemDesignation] = itemKey.split('§');
        let item = rulebook.rulebook.assetCatalog[itemKey];

        // dedup traits
        if(item.assets?.traits){
          item.assets.traits = [...new Set(item.assets.traits)];
        }

        // add missing classes
        classList.add(itemClass);
        
      });
      classList.forEach(itemClass => {
        rulebook.rulebook.assetTaxonomy[itemClass] = rulebook.rulebook.assetTaxonomy[itemClass] || {};
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