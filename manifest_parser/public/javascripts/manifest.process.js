// TODO: Error reporting
// TODO: Fix incrementation guess

const subFacNames = {
  AS: 'Order',
  AdM: 'Forge World',
  AE: 'Craftworld',
  AM: 'Regiment',
  CD: 'Allegiance',
  QT: 'Dread Household', // Questor Traitoris
  CSM: 'Legion',
  DG: 'Plague Company',
  DRU: 'Kabal', // Wych Cult, Haemunculous Coven
  GC: 'Cult',
  GK: 'Brotherhood',
  QI: 'Noble Household', // Questor Allegiance
  NEC: 'Dynasty',
  ORK: 'Clan',
  SM: 'Chapter',
  TAU: 'Sept',
  TS: 'Great Cult',
  TYR: 'Hive Fleet',
}
processInfo = (data,factionKey) => {
  let factionName = data.factions.find(faction => faction.faction_id == factionKey).name
  let info = {
    name: factionName,
    game: 'Warhammer 40,000',
    genre: 'sci-fi',
    publisher: 'Games Workshop',
    url: 'https://warhammer40000.com/',
    notes: '0.0.7: single-model units no longer have any "model" asssets\n\n0.0.6: "source" keyword category\n\n0.0.5: add relics\n\nThis manifest is provided for the purposes of testing the features of *Rosterizer* and is not intended for distribution.\n\nThe data included herein was programatically compiled from freely-available sources on the internet and likely contains some errors. Use with caution.',
    revision: '0.0.7',
    wip: true,
    dependencies: [
      {
        slug: "123456",
        name: "40k9e",
        game: "Warhammer 40,000"
      }
    ],
    manifest: {},
  }
  return info
}
processItems = (data) => {
  let assetCatalog = {'Roster§Army': {}};
  processModels(data,assetCatalog);
  processAbilities(data,assetCatalog);
  processWargear(data,assetCatalog);
  processRelics(data,assetCatalog);
  processPsychicPowers(data,assetCatalog);
  processWarlordTraits(data,assetCatalog);
  processUnits(data,assetCatalog);
  return assetCatalog
}
processClasses = data => {
  let assetTaxonomy = {};
  processFactions(data,assetTaxonomy);
  processPsychicClasses(data,assetTaxonomy);
  processRelicClasses(data,assetTaxonomy);
  return assetTaxonomy
}
processModels = (data,assetCatalog) => {
  data.models.forEach((model,i,a) => {
    a[i].duplicated = data.models.filter(dataModel => dataModel.name === a[i].name).length - 1
    a[i].itemKey = 'Model§' + a[i].name;
    if(a[i].duplicated){
      let unitName = data.datasheets.filter(datasheet => datasheet.datasheet_id == model.datasheet_id)[0].name;
      a[i].itemKey += ` (${unitName})`;
    }
  });
  let modelList = Array.from(new Set(data.models.map(model => model.itemKey)));
  modelList.forEach(modelItemKey => {
    let dupModels = data.models.filter(model => model.itemKey === modelItemKey);
    let tempItem = dedupModels(dupModels);
    if(dupModels[0].duplicated){
      tempItem.rules = {
        'rename me': {
          evals:[],
          failState: 'pass',
          evaluate: 'AND',
          actions: [
            {
              paths: [
                [
                  '{self}',
                  'designation'
                ]
              ],
              actionType: 'set',
              value: dupModels[0].name,
              iterations: 1
            }
          ]
        }
      }
    }
    assetCatalog[modelItemKey] = tempItem;
    // console.log(modelItemKey)
  });
}
numerize = (value) => {
  let initialValue = (value + '').replace(/^([0-9]*)"/g,'$1″').replace(/^([0-9]*)\+/g,'$1');
  let numberTest = Number(initialValue);
  if(numberTest + '' !== initialValue) return initialValue
  return numberTest
}
dedupModels = (dupModels) => {
  let deduped = dupModels[0];
  let props = ['attacks','ballistic_skill','base_size','cost','leadership','movement','save','strength','toughness','weapon_skill','wounds'];
  props.forEach(prop => {
    let arr = dupModels.map(model => model[prop]);
    deduped[prop] = findMode(arr);
  });
  return {
    stats: {
      Points: {value: numerize(deduped.cost)},
      M: {value: numerize(deduped.movement)},
      WS: {value: numerize(deduped.weapon_skill)},
      BS: {value: numerize(deduped.ballistic_skill)},
      S: {value: numerize(deduped.strength)},
      T: {value: numerize(deduped.toughness)},
      W: {value: numerize(deduped.wounds)},
      A: {value: numerize(deduped.attacks)},
      Ld: {value: numerize(deduped.leadership)},
      Sv: {value: numerize(deduped.save)},
      Base: {value: numerize(deduped.base_size)},
    }
  }
}
findMode = (arr) => {
  if (arr.length == 0) return null;

  var modeMap = {},
    maxEl = [arr[0]],
    maxCount = 1;

  for (var i = 0; i < arr.length; i++) {
    var el = arr[i];

    if (modeMap[el] == null) modeMap[el] = 1;
    else modeMap[el]++;

    if (modeMap[el] > maxCount) {
      maxEl = [el];
      maxCount = modeMap[el];
    } else if (modeMap[el] == maxCount) {
      maxEl.push(el);
      maxCount = modeMap[el];
    }
  }
  // console.log(maxEl)
  let val = maxEl.sort((a,b) => {
    if(typeof a === 'string' && typeof b === 'string') return b.localeCompare(a);
    else if(typeof a === 'number' && typeof b === 'number') return a-b
  })[0];
  return val
}
ordinalize = (n,keepNumber = true) => {
  const ordinals = ['th','st','nd','rd'];
  let v = n % 100;
  return (keepNumber?n:'') + (ordinals[(v-20)%10]||ordinals[v]||ordinals[0]);
}
processAbilities = (data,assetCatalog) => {
  data.abilities.abilities.forEach((ability,i,a) => {
    // console.log(ability.name)
    // console.log(formatText(ability.description))
    let shouldLog = false;// = ability.name === 'Tactical Precision (Aura)';
    let tempAbility = {text: formatText(ability.description,shouldLog)};
    let itemKey;
    if(!ability.is_other_wargear){
      itemKey = 'Ability§' + ability.name;
      if(!assetCatalog[itemKey]) assetCatalog[itemKey] = tempAbility;
      else assetCatalog[itemKey].text += '\n\n***ERROR***—*The following text was found on another ability with the same name:*  \n' + formatText(ability.description,shouldLog);
    }else{
      itemKey = 'Wargear§' + ability.name;
      let abilityCostArr = data.abilities.datasheets_abilities.filter(datasheets_ability => datasheets_ability.ability_id === ability.ability_id).map(datasheets_ability => datasheets_ability.cost);
      let costMode = findMode(abilityCostArr);
      if(costMode) tempAbility.stats = {Points: {value: numerize(costMode)}};
      if(!assetCatalog[itemKey]) assetCatalog[itemKey] = tempAbility;
      else assetCatalog[itemKey].text += '\n\n***ERROR***—*The following text was found on another wargear with the same name:*  \n' + formatText(ability.description,shouldLog);
    }
    let subFactTest = new RegExp(`&lt;${data.factCurrent}&gt;`, 'gi');
    if(subFactTest.test(assetCatalog[itemKey].text)){
      let ruleText = assetCatalog[itemKey].text.replace(subFactTest,'{v}')
      assetCatalog[itemKey].text = '';
      // console.log(ruleText)
      assetCatalog[itemKey].stats = assetCatalog[itemKey].stats || {};
      assetCatalog[itemKey].stats[data.factCurrent] = {
        statType: 'term',
        value: `&lt;${data.factCurrent.toUpperCase()}&gt;`,
        text: ruleText,
        visibility: 'hidden',
        dynamic: true
      }
    }
    a[i].itemKey = itemKey;
    data.text = data.text || '';
    data.text += assetCatalog[itemKey].text;
  });
  data.abilities.composed = [];
  data.abilities.datasheets_abilities.forEach((element) => {
    data.abilities.composed.push({
      ...element,
      ...data.abilities.abilities.find(e=>e.ability_id===element.ability_id)
    });  
  });
}
processWargear = (data,assetCatalog) => {
  data.wargear.wargear_list.forEach(wargear => {
    let weapName = wargear.name.replace(/(1: |2: |3: )/,'').replace(/в/g,'d');
    let tempWeapon = {stats:{
      AP: {value: numerize(wargear.armor_piercing)},
      D: {value: numerize(wargear.damage)},
      S: {value: numerize(wargear.strength)},
      Type: {value: numerize(wargear.type)},
      Range: {value: numerize(wargear.weapon_range)},
    }};
    if(wargear.abilities) tempWeapon.text = formatText(wargear.abilities);
    let wargearArr = data.wargear.wargear_list.filter(wargear_list => wargear_list.wargear_id == wargear.wargear_id).map(wargear => 'Weapon§' + wargear.name);
    let costArr = data.wargear.datasheets_wargear.filter(datasheets_wargear => datasheets_wargear.wargear_id == wargear.wargear_id).map(wargear => wargear.cost);
    let cost = findMode(costArr);
    // console.log(wargear.wargear_id,cost,costArr)
    if(wargearArr.length == 1 && cost){
      tempWeapon.stats.Points = {value: numerize(cost)};
    }
    assetCatalog['Weapon§' + weapName] = tempWeapon;
    if(wargearArr.length > 1){
      // console.log(wargearArr,weapName)
      let itemKey = 'Wargear§' + data.wargear.wargear.filter(gear => gear.wargear_id == wargear.wargear_id)[0].name;
      assetCatalog[itemKey] = assetCatalog[itemKey] || {};
      assetCatalog[itemKey].assets = assetCatalog[itemKey].assets || {};
      assetCatalog[itemKey].assets.traits = assetCatalog[itemKey].assets.traits || [];
      assetCatalog[itemKey].assets.traits.push('Weapon§' + weapName);
      if(cost){
        assetCatalog[itemKey].stats = {Points: {value: numerize(cost)}};
      }
    }
  });
  let shootingMelee = data.wargear.wargear_list.filter(wargear => wargear.name.includes('(shooting)') || wargear.name.includes('(melee)'));
  let shooting = shootingMelee.filter(wargear => wargear.name.includes('(shooting)'));
  let melee = shootingMelee.filter(wargear => wargear.name.includes('(melee)'));
  shooting.forEach(shooter => {
    let bareName = shooter.name.replace(' (shooting)','');
    if(melee.filter(meleer => meleer.name.includes(bareName))){
      assetCatalog['Wargear§'+bareName] = {
        assets: {traits:[
          'Weapon§'+bareName+' (melee)',
          'Weapon§'+bareName+' (shooting)',
        ]}
      }
      if(assetCatalog['Weapon§'+shooter.name].stats?.Points?.value){
        assetCatalog['Wargear§'+bareName].stats = assetCatalog['Wargear§'+bareName].stats || {};
        assetCatalog['Wargear§'+bareName].stats.Points = assetCatalog['Wargear§'+bareName].stats.Points || {};
        assetCatalog['Wargear§'+bareName].stats.Points.value = assetCatalog['Weapon§'+shooter.name].stats.Points.value;
        delete assetCatalog['Weapon§'+shooter.name].stats;
        delete assetCatalog['Weapon§'+bareName+' (melee)']?.stats;
      }
    }
  });
  data.wargear.composed = [];
  data.wargear.datasheets_wargear.forEach((wargear) => {
    let wargearArr = data.wargear.wargear_list.filter(wargear_list => wargear_list.wargear_id == wargear.wargear_id);
    let thisWargear = data.wargear.wargear.find(e=>e.wargear_id===wargear.wargear_id);
    data.wargear.composed.push({
      ...wargear,
      ...thisWargear,
      itemKey: (wargearArr.length == 1 ? 'Weapon§' : 'Wargear§') + thisWargear.name
    });  
  });
}
createWargearStat = (i,wargearArr,modelLoadout,assetCatalog) => {
  var stringSimilarity = require('string-similarity');
  let bestMatchIndex = stringSimilarity.findBestMatch(modelLoadout[i]?.toLowerCase() || '',wargearArr.map(gear => gear.itemKey.toLowerCase())).bestMatchIndex;
  let current = i < modelLoadout.length ? wargearArr[bestMatchIndex].itemKey.split('§')[1] : '-';
  let tempStat = {
    value: current,
    label: 'Loadout',
    statType: 'rank',
    statOrder: i+1,
    group: 'Loadout',
    groupOrder: 2,
    ranks: {
      '-': {order: 0},
    },
    visibility: 'active',
    dynamic: true
  }
  wargearArr.forEach((wargear,i) => {
    let wargearName = wargear.itemKey.split('§')[1];
    let actualTrait = assetCatalog[wargear.itemKey];
    let assignedTrait = (actualTrait?.stats?.Points?.value === undefined && !wargear.cost) || actualTrait?.stats?.Points?.value == wargear.cost ? wargear.itemKey : {
      item: wargear.itemKey,
      stats: {Points: {value: numerize(wargear.cost)}}
    }
    tempStat.ranks[wargearName] = {
      order: i+1,
      traits: [{trait: assignedTrait}],
    }
  });
  return tempStat
}
processRelics = (data,assetCatalog) => {
  // console.log(data.relics.relic_list)
  data.relics.relic_list?.forEach(relic => {
    let weapName = relic.name.replace(/(1: |2: |3: )/,'').replace(/в/g,'d').replace(/^"*(.*[^"])"*$/g,'$1').replace(/^\s*(.*[^\s])\s*$/g,'$1');
    let tempWeapon = {stats:{
      AP: {value: numerize(relic.armor_piercing)},
      D: {value: numerize(relic.damage)},
      S: {value: numerize(relic.strength)},
      Type: {value: numerize(relic.type)},
      Range: {value: numerize(relic.weapon_range)},
    }};
    if(relic.abilities) tempWeapon.text = formatText(relic.abilities);
    let relicsArr = data.relics.relic_list.filter(relic_list => relic_list.wargear_id == relic.wargear_id).map(relic => 'Relic Weapon§' + relic.name);
    let relicType = data.relics.relics.filter(gear => gear.wargear_id == relic.wargear_id)[0].type;
    let relicName = data.relics.relics.filter(gear => gear.wargear_id == relic.wargear_id)[0].name;
    let itemKey = relicType + '§' + relicName;
    if(relicsArr.length === 1){
      assetCatalog[itemKey] = tempWeapon;
    }else if(relicsArr.length > 1){
      assetCatalog['Relic Weapon§' + weapName] = tempWeapon;
      // console.log(relicsArr,weapName)
      assetCatalog[itemKey] = assetCatalog[itemKey] || {};
      assetCatalog[itemKey].assets = assetCatalog[itemKey].assets || {};
      assetCatalog[itemKey].assets.traits = assetCatalog[itemKey].assets.traits || [];
      assetCatalog[itemKey].assets.traits.push('Relic Weapon§' + weapName);
    }
  });
  let shootingMelee = data.relics.relic_list.filter(relics => relics.name.includes('(shooting)') || relics.name.includes('(melee)'));
  let shooting = shootingMelee.filter(relics => relics.name.includes('(shooting)'));
  let melee = shootingMelee.filter(relics => relics.name.includes('(melee)'));
  shooting.forEach(shooter => {
    let bareName = shooter.name.replace(' (shooting)','');
    if(melee.filter(meleer => meleer.name.includes(bareName))){
      let relicType = data.relics.relics.filter(gear => gear.wargear_id == shooter.wargear_id)[0].type;
      assetCatalog[relicType+'§'+bareName] = {
        assets: {traits:[
          'Relic Weapon§'+bareName+' (melee)',
          'Relic Weapon§'+bareName+' (shooting)',
        ]}
      }
      if(assetCatalog['Relic Weapon§'+shooter.name].stats?.Points?.value){
        assetCatalog[relicType+'§'+bareName].stats = assetCatalog[relicType+'§'+bareName].stats || {};
        assetCatalog[relicType+'§'+bareName].stats.Points = assetCatalog[relicType+'§'+bareName].stats.Points || {};
        assetCatalog[relicType+'§'+bareName].stats.Points.value = assetCatalog['Relic Weapon§'+shooter.name].stats.Points.value;
        delete assetCatalog['Relic Weapon§'+shooter.name].stats;
        delete assetCatalog['Relic Weapon§'+bareName+' (melee)'].stats;
      }
    }
  });
  data.relics.relics.forEach(relic => {
    let itemKey = relic.type + '§' + relic.name;
    assetCatalog[itemKey] = assetCatalog[itemKey] || {};
    if(relic.description) assetCatalog[itemKey].text = formatText(relic.description);
  });
}
processPsychicPowers = (data,assetCatalog) => {
  data.psychicPowers.forEach(power => {
    if(power.type){
      let powerName = power.type + '§' + power.name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      let tempPower = {
        text: formatText(power.description)
      };
      if(power.roll) tempPower.stats = {Roll:{value: numerize(power.roll)}};
      assetCatalog[powerName] = tempPower;
    }else{
      let powerName = 'Psychic Power§' + power.name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      let tempPower = {
        text: formatText(power.description)
      };
      assetCatalog[powerName] = tempPower;
    }
  });
}
processWarlordTraits = (data,assetCatalog) => {
  data.warlordTraits.forEach(trait => {
    let traitName = 'Warlord Trait§' + trait.name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let tempTrait = {
      text: formatText(trait.description),
      stats:{Discipline:{
        value: trait.type + (trait.roll ? (' ' + trait.roll) : '')
      }}
    };
    assetCatalog[traitName] = tempTrait;
  });
}
formatText = (text,log = false) => {
  let newText = text
  let replacePatterns1 = {
    pPattern: [/<p[^>]+>((?:.(?!\<\/p\>))*.)<\/p>/g,'$1'],
    divPattern: [/<div[^>]+>((?:.(?!\<\/div\>))*.)<\/div>/g,'$1'],
    anchorPattern: [/<a[\s]+href="([^>]+)">((?:.(?!\<\/a\>))*.)<\/a>/g,'[$2](https://wahapedia.ru$1)'],
    tooltipPattern: [/<span[\s]+class="tooltip([^>]+)>((?:.(?!\<\/span\>))*.)<\/span>/g,'$2'],
    kwb3Pattern: [/<span[\s]+class="kwb3">((?:.(?!\<\/span\>))*.)<\/span>/g,'$1'],
    boldunderPattern: [/<span[\s]+class="kwb kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b><i>$1</i></b>'],
    boldPattern: [/<span[\s]+class="kwb">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    underPattern: [/<span[\s]+class="kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<i>$1<i>'],
    ttPattern: [/<span[\s]+class="tt">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    boldunderPattern2: [/<span[\s]+class="kwb kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b><i>$1</i></b>'],
    boldPattern2: [/<span[\s]+class="kwb">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    underPattern2: [/<span[\s]+class="kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<i>$1<i>'],
    ttPattern2: [/<span[\s]+class="tt">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    ttPattern3: [/<span[\s]+class="tt kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    ttPattern4: [/<span[\s]+class="tt kwbu">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    h_customPattern: [/<span[\s]+class="h_custom">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
    redfontPattern: [/<span[\s]+class="redfont">((?:.(?!\<\/span\>))*.)<\/span>/g,'<b>$1</b>'],
  }
  let replacePatterns2 = {
    doubleBoldEndPattern: [/<\/b><\/b>/g,'</b>'],
    doubleItalicsEndPattern: [/<\/i>((?:.(?!\<i\>))*)<\/i>/g,'$1<i>'],
    whitespacePattern1: [/\<\/b\>[\s]\<b\>/g,' '],
    whitespacePattern2: [/\<\/i\>[\s]\<i\>/g,' '],
    boldTranslationPattern: [/<\/?b>/g,'**'],
    doubleBoldPattern: [/\*\*\*\*/g,''],
    doubleBoldPattern2: [/\*\*\s\*\*/g,' '],
    italicsTranslationPattern: [/<\/?i>/g,'*'],
    doublePrime: [/\s([0-9]+)"(\.*)\s/g,' $1″$2 '],  
  }
  newText = text.replace(/kwb2/g,'kwb');
  if(log) console.log(newText)
  Object.entries(replacePatterns1).forEach(([name,pattern]) => {
    newText = newText.replace(pattern[0],pattern[1]);
    if(log) console.log(name,newText)
  });
  if(log) console.log(newText)
  let newTextArr = newText.split('<b>');
  if(log) console.log(newTextArr)
  newTextArr.forEach((sliver,i,a) => {
    if(i > 0 && a[i+1]?.includes('</b>')){
      a[i+1] = a[i] + a[i+1];
      delete a[i];
    }
  });
  newText = Object.values(newTextArr).join('<b>');
  newTextArr = newText.split('<i>');
  newTextArr.forEach((sliver,i,a) => {
    if(i > 0 && a[i+1]?.includes('</i>')){
      a[i+1] = a[i] + a[i+1];
      delete a[i];
    }
  });
  newText = Object.values(newTextArr).join('<i>');
  Object.entries(replacePatterns2).forEach(([name,pattern]) => {
    newText = newText.replace(pattern[0],pattern[1]);
    if(log) console.log(name,newText)
  });
  // newText = newText.replace(/"/g,'″'); // too many html structures get screwed by this
  newText = newText.replace(/<ul[^>]+><li>/g,'* ');
  newText = newText.replace(/<ul><li>/g,'* ');
  if(log) console.log(newText)
  newText = newText.replace(/<\/li><li>/g,'\n* ');
  if(log) console.log(newText)
  newText = newText.replace(/<\/li><\/ul>/g,'');
  if(log) console.log(newText)
  newText = newText.replace(/<br>/g,'\n\n');
  if(log) console.log(newText)
  return newText
}
processUnits = (data,assetCatalog) => {
  var stringSimilarity = require('string-similarity');
  data.datasheets.forEach(datasheet => {
    let unitId = datasheet.datasheet_id;
    let tempItem = {stats:{
      'Power Level': {
        value: numerize(datasheet.power_points)
      }
    },keywords:{},assets:{}};

    let models = data.models.filter(model => model.datasheet_id === unitId);
    let singleModelUnit = models[0]?.models_per_unit == 1 && models.length == 1;
    if(models[0]?.line === 1 && models[0]?.models_per_unit.includes('-')){
      tempItem.stats.model = {
        value: data.models.filter(model => model.datasheet_id === unitId && model.line === 1)[0].itemKey
      }
    }

    let modelDamage = data.damage.filter(dmgLine => dmgLine.datasheet_id == unitId);
    if(modelDamage.length){
      let modelItemKey = models.filter(model => model.datasheet_id === unitId)[0].itemKey;
      // console.log(unitId,modelItemKey)
      assetCatalog[modelItemKey].stats['W'] = {
        value: numerize(assetCatalog[modelItemKey].stats['W'].value),
        max: numerize(assetCatalog[modelItemKey].stats['W'].value),
        min: 1,
        dynamic: true,
        increment: {value: 1},
        statType: 'numeric',
        visibility: 'always',
      }
      assetCatalog[modelItemKey].rules = assetCatalog[modelItemKey].rules || {};
      assetCatalog[modelItemKey].rules.dynamicDamageMid = generateDamageRule(modelDamage[0],modelDamage[2]);
      assetCatalog[modelItemKey].rules.dynamicDamageLow = generateDamageRule(modelDamage[0],modelDamage[3]);
    }

    let options = data.options.filter(option => option.datasheet_id === unitId);
    tempItem.text = formatText(datasheet.unit_composition + '\n\n' + options.map(option => (option.button || '') + ' ' + option.description).join('\n\n') + '\n\n' + datasheet.psyker);

    let abilities = data.abilities.composed.filter(ability => ability.datasheet_id === unitId);
    let abilityList = abilities.filter(ability => ability.datasheet_id === unitId && !ability.is_other_wargear);
    let wargearList = abilities.filter(ability => ability.datasheet_id === unitId && ability.is_other_wargear);
    abilityList.forEach(ability => {
      tempItem.assets = tempItem.assets || {};
      tempItem.assets.traits = tempItem.assets.traits || [];
      tempItem.assets.traits.push(ability.itemKey);
    });
    if(datasheet.psyker?.includes('Smite')){
      tempItem.assets = tempItem.assets || {};
      tempItem.assets.traits = tempItem.assets.traits || [];
      tempItem.assets.traits.push('Psychic Power§Smite');
    }
    const order = ['Ability§', 'Wargear§', 'Psychic Power§', 'Model§'];
    tempItem.assets.traits?.sort((a, b) => stringSimilarity.findBestMatch((a.item || a),order).bestMatchIndex - stringSimilarity.findBestMatch((b.item || b),order).bestMatchIndex);

    Array.from(new Set(data.psychicPowers.map(power => power.type))).forEach(discipline => {
      // console.log(discipline)
      // console.log(datasheet.psyker)
      let test = new RegExp(discipline,'gi')
      if(test.test(datasheet.psyker)){
        tempItem.allowed = tempItem.allowed || {};
        tempItem.allowed.classifications = tempItem.allowed.classifications || [];
        tempItem.allowed.classifications.push(discipline);
      }
    });

    wargearList.forEach(wargear => {
      let tempWargear = wargear.cost === assetCatalog[wargear.itemKey].stats?.Points?.value ? wargear.itemKey : {
        item: wargear.itemKey,
        stats: {
          Points: {value: numerize(wargear.cost)}
        }
      };
      tempItem.stats = tempItem.stats || {};
      tempItem.stats[wargear.name] = {
        value: 0,
        statType: 'rank',
        statOrder: 10,
        group: 'Loadout',
        groupOrder: 2,
        ranks: {
          0: {order: 0,number: 0,icons: ['cancel']},
          1: {order: 1,number: 1,icons: ['confirmed'],traits: [{trait: tempWargear}]}
        },
        visibility: 'active',
        dynamic: true
      }
    });
    // console.log(datasheet.name,unitId,wargearList)

    let wargearArr = data.wargear.composed.filter(wargear => wargear.datasheet_id == unitId).sort((a,b) => a.itemKey.localeCompare(b.itemKey));
    wargearArr.slice().forEach((gear,i) => {
      if(wargearArr[i]?.itemKey?.includes(' (melee)') && wargearArr[i+1].itemKey?.includes(' (shooting)')){
        wargearArr[i].itemKey = wargearArr[i].itemKey.replace('Weapon§','Wargear§').replace(' (melee)','');
        delete wargearArr[i+1];
      }
    });
    wargearArr = Object.values(wargearArr);
    let equippedWargearArr = datasheet.unit_composition?.replace(/is equipped<br>with/g,'is equipped with').replace(/(<br>|<ul><li>|<li><li>|<\/li><\/ul>|<\/b> |\.\s)/g,'. ').split('. ').filter(el => el.includes('is equipped')).map(el => el.split(/is equipped with/).map(subEl => subEl.split('; ').map(equip => equip.replace(/^([:Aa1]\s)*/,''))));
    // console.log(datasheet.name,unitId,wargearArr,datasheet.unit_composition)
    equippedWargearArr?.forEach(modelLoadout => {
      // console.log(modelLoadout[0][0],modelLoadout[1])
      if(!modelLoadout[1]?.includes(' nothing.')){
        let upgradeQty = modelLoadout[1]?.length ? (modelLoadout[1].length + 1) : 0;
        if(
          stringSimilarity.compareTwoStrings(modelLoadout[0][0],'Every model') > .5
          || stringSimilarity.compareTwoStrings(modelLoadout[0][0],'Each model') > .5
          || stringSimilarity.compareTwoStrings(modelLoadout[0][0],'This model') > .5
        ){
          models.forEach(modelData => {
            let tempItem = assetCatalog[modelData.itemKey];
            if(upgradeQty) tempItem.stats = tempItem.stats || {};
            for (let i = 0; i < upgradeQty; i++) {
              tempItem.stats['loadout'+(i+1)] = createWargearStat(i,wargearArr,modelLoadout[1],assetCatalog);
              // console.log(tempItem,upgradeQty)
            }
          });
        }else{
          let modelNames = models.map(thisModel => thisModel.name);
          let modelIndex = stringSimilarity.findBestMatch(modelLoadout[0][0],modelNames).bestMatchIndex;
          let tempItem = assetCatalog[models[modelIndex].itemKey];
          if(upgradeQty) tempItem.stats = tempItem.stats || {};
          for (let i = 0; i < upgradeQty; i++) {
            tempItem.stats['loadout'+(i+1)] = createWargearStat(i,wargearArr,modelLoadout[1],assetCatalog);
            // console.log(tempItem,upgradeQty)
          }
        }
      }
    });

    if(models[0]?.models_per_unit?.includes('-')){
      tempItem.stats[datasheet.name] = {
        statType: 'numeric',
        dynamic: true,
        visibility: 'active',
        group: 'Loadout',
        groupOrder: 2,
      };
      let stat = tempItem.stats[datasheet.name];
      let range = models[0].models_per_unit.split('-');
      stat.value = Number(range[0]);
      stat.min = Number(range[0]);
      stat.max = Number(range[1]);
      let basePlThresh = stat.min;
      if(!(stat.max % stat.min)){
        // console.log(datasheet.name,'has a clean threshold')
        stat.increment = {value: numerize(stat.min)};
      }
      else if(!((stat.max + 1) % (stat.min + 1)) && models[1]?.models_per_unit == 1){
        // console.log(datasheet.name,'has a sergeant')
        stat.increment = {value: numerize(stat.min) + 1};
        // console.log(stat)
        basePlThresh ++;
      }else tempItem.text += '\n\n***ERROR***—*there might be a problem with incrementation that will require inputting by hand.*';
      let PLArr = datasheet.unit_composition.split(/(\<b\>Power Rating |\<\/b\>)/).map(el => Number(el.replace('+','plus'))).filter(el => !isNaN(el));
      if(PLArr.length){
        let tempInc = PLArr[0] - datasheet.power_points;
        // console.log(datasheet.name,basePlThresh,tempInc,PLArr)
        for (let i = 0; i < PLArr.length; i++) {
          if(PLArr[i] !== ((i+1) * tempInc) + Number(datasheet.power_points)){
            // console.log(PLArr[i],tempInc,Number(datasheet.power_points), ((i+1) * tempInc) + Number(datasheet.power_points))
            tempItem.text += '\n\n***ERROR***—*there might be a problem with Power Rating that will require a custom rule.*';
            tempInc = 0;
            break;
          }
        }
        if(tempInc){
          tempItem.stats.poweri = {value:tempInc};
          for (let i = 0; i < PLArr.length; i++) {
            tempItem.stats['power'+(i+1)] = {
              "value": (basePlThresh * (i + 1)) + 1
            }
          }
        }
      }else if(datasheet.unit_composition.includes('Power Rating')) tempItem.text += '\n\n***ERROR***—*there might be a problem with Power Rating that will require a custom rule.*';
    }
    models.forEach(model => {
      let [minQty,maxQty] = model.models_per_unit.split('-').map(qty => Number(qty));
      if(minQty){
        // console.log(datasheet.name,model.name,model.models_per_unit,models.length)
        if(singleModelUnit){
          let modelAsset = assetCatalog[model.itemKey];
          // console.log(modelAsset)
          tempItem = {
            ...tempItem,
            stats: {
              ...tempItem.stats,
              ...modelAsset.stats,
            },
            rules: {
              ...tempItem.rules,
              ...modelAsset.rules,
            }
          }
          if(!Object.keys(tempItem.rules).length) delete tempItem.rules;
        }else{
          let tempTrait = {item: model.itemKey};
          if(minQty > 1) tempTrait.quantity = minQty;
          // console.log(tempTrait)
          if(Object.keys(tempTrait).length === 1) tempTrait = model.itemKey;
          tempItem.assets.traits = tempItem.assets.traits || [];
          tempItem.assets.traits.push(tempTrait);
        }
      }
      if(minQty > 1 || maxQty > 1 || !minQty){
        tempItem.allowed = tempItem.allowed || {};
        tempItem.allowed.items = tempItem.allowed.items || [];
        tempItem.allowed.items.push(model.itemKey)
      }
    });

    let source = data.sources.filter(source => source.source_id == datasheet.source_id)[0];
    // console.log(source)
    if(source){
      let errataDate = source.errata_date.split(' ')[0].split('.').reverse().join('-');
      tempItem.meta = tempItem.meta || {};
      tempItem.meta.Publication = `[${source.name} (${source.type}) ${ordinalize(source.edition)} ed. – ${source.version || ''} @${errataDate}](${source.errata_link})`;
      tempItem.keywords.Source = [`${source.type}—${source.name}${source.version ? ('—'+source.version) : ''}`];
      if(source.edition) tempItem.keywords.Edition = [ordinalize(source.edition)];
    }

    let keywordList = data.keywords.filter(keyword => keyword.datasheet_id === unitId && !keyword.is_faction_keyword);
    if(keywordList.length) tempItem.keywords.Keywords = keywordList.map(keyword => keyword.keyword);
    let factionKeywords = data.keywords.filter(keyword => keyword.datasheet_id === unitId && keyword.is_faction_keyword);
    if(factionKeywords.length) tempItem.keywords.Faction = factionKeywords.map(keyword => keyword.keyword);

    assetCatalog[datasheet.role + '§' + datasheet.name] = tempItem;
  });
  data.datasheets.forEach(datasheet => {
    let unitId = datasheet.datasheet_id;
    let models = data.models.filter(model => model.datasheet_id === unitId);
    // console.log(unitId,data.models,unitId)
    let modelItemKey = models.filter(model => model.datasheet_id === unitId)[0]?.itemKey;
    let singleModelUnit = models[0]?.models_per_unit == 1 && models.length == 1;
    if(singleModelUnit && modelItemKey) delete assetCatalog[modelItemKey];
  });
}
generateDamageRule = (damageRows,currentRow) => {
  // console.log(damageRows,currentRow)
  let [min,max] = currentRow.col1.split('-');
  let newRule = {
    evals: [
      {
        paths: [
          ['{self}','stats','W','value']
        ],
        max: max,
        min: min,
        operator: 'AND',
        not: false,
        actionable: true
      }
    ],
    failState: 'pass',
    evaluate: 'AND',
    actions: [
      {
        paths: [
          ['{self}','stats',damageRows.col2,'value']
        ],
        actionType: 'set',
        value: numerize(currentRow.col2),
        iterations: 1
      },
      {
        paths: [
          ['{self}','stats',damageRows.col3,'value']
        ],
        actionType: 'set',
        value: numerize(currentRow.col3),
        iterations: 1
      },
      {
        paths: [
          ['{self}','stats',damageRows.col4,'value']
        ],
        actionType: 'set',
        value: numerize(currentRow.col4),
        iterations: 1
      }
    ]
  }
  return newRule
}
processFactions = (data,assetTaxonomy) => {
  let fac = data.factions[0].main_faction_id;
  // console.log(fac,data.factions.length)
  data.factCurrent = subFacNames[fac];
  if(data.factions.length > 1){
    assetTaxonomy.Detachment = {
      stats: {
        [subFacNames[fac]]: {
          statType: 'rank',
          value: '-',
          ranks: {
            '-': {
              order: 0
            },
          },
          dynamic: true,
        }
      },
      rules: {
        'populate faction': {
          evals: [
            {
              paths: [
                ["{self}","stats",subFacNames[fac],"value"]
              ],
              value: "-",
              operator: "AND",
              not: true,
              actionable: true
            }
          ],
          failState: 'pass',
          evaluate: 'OR',
          actions: [
            {
              paths: [
                [
                  '{self}',
                  'assets',
                  'templateClass',
                  'Unit',
                  'traits',
                  'classification',
                  'Ability',
                  'stats',
                  subFacNames[fac],
                  'value',
                ]
              ],
              actionType: 'set',
              value: [
                '{self}',
                'stats',
                subFacNames[fac],
                'value',
              ],
              iterations: 1
            }
          ]
        }
      }
    }
    data.factions.filter(faction => faction.faction_id != faction.main_faction_id).forEach((faction,i) => {
      let newRank = {order:i+1}
      assetTaxonomy.Detachment.stats[subFacNames[fac]].ranks[faction.name] = newRank;
    });
    assetTaxonomy.Unit = {
      rules: {
        'replace subfaction keyword': {
          evals: [
            {
              paths: [
                ['{parent}','stats',data.factCurrent,'value']
              ],
              value: '-',
              operator: 'AND',
              not: true
            },
            {
              paths: [
                ['{self}','keywords','Faction']
              ],
              value: `<${data.factCurrent}>`,
              contains: true,
              operator: 'AND',
              not: false,
              actionable: true
            }
          ],
          failState: 'pass',
          evaluate: 'AND',
          actions: [
            {
              paths: [
                ['{self}','keywords','Faction']
              ],
              actionType: 'remove',
              value: `<${data.factCurrent}>`,
              iterations: 1
            },
            {
              paths: [
                ['{self}','keywords','Faction']
              ],
              actionType: 'add',
              value: ['{parent}','stats',data.factCurrent,'processed','rank','current'],
              iterations: 1
            }
          ]
        }
      }
    }
  }
}
processPsychicClasses = (data,assetTaxonomy) => {
  data.psychicPowers.forEach(power => {
    if(power.type){
      assetTaxonomy[power.type] = assetTaxonomy[power.type] || {
        templateClass: 'Psychic Power'
      }
    }
  });
}
processRelicClasses = (data,assetTaxonomy) => {
  data.relics.relics.forEach(relic => {
    if(relic.type){
      assetTaxonomy[relic.type] = assetTaxonomy[relic.type] || {
        templateClass: 'Relic'
      }
    }
  });
}
module.exports = { processItems };