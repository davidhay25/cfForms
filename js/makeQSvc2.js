angular.module('pocApp')
    .service('makeQSvc2', function (utilsSvc) {

        /* ================================================================
         * Public API
         * ================================================================ */

        this.buildQuestionnaireFromFlat = function (inItems,dg,config) {
            const warnings = [];
            const pathIndex = new Map();    //a hash of item by path
            const idIndex = {}                 //hash by id - used for conditionals

            let questionnaire = makeInitialQuestionnaire(dg,config)     //generate the questionnaire

            // create an array with just the ED elements
            let items = []
            for (const i of inItems) {
                items.push(i.ed)
            }
            items.splice(0,1)


            // 1. Build hierarchy + index
            items.forEach(src => insertItem(questionnaire.item, src, pathIndex, idIndex, warnings));


            // 2. Resolve enableWhen
            resolveEnableWhen(questionnaire.item, pathIndex, idIndex, warnings);

            // 3. Clean out synthetic/underscore properties and empty items
            const cleanQ = cleanQuestionnaire(questionnaire);

            return { questionnaire: cleanQ, warnings };
        };

        /* ================================================================
         * Hierarchy construction
         * ================================================================ */

        function insertItem(rootItems, ed, pathIndex, idIndex, warnings) {
            const segments = ed.path.split('.');
            let currentItems = rootItems;
            let currentItem = null;

            segments.forEach((segment, index) => {
                const fullPath = segments.slice(0, index + 1).join('.');
                currentItem = getOrCreateItem(currentItems, segment, fullPath);

                // Index every node (real or synthetic)
                pathIndex.set(fullPath, currentItem);
                idIndex[ed.id] = currentItem

                // Leaf: apply source data
                if (index === segments.length - 1) {
                    applySourceToItem(currentItem, ed);
                    delete currentItem._synthetic;
                }

                currentItems = currentItem.item;
            });
        }

        function getOrCreateItem(items, segment, fullPath) {
            let item = items.find(i => i._segment === segment);

            if (!item) {
                item = {
                    linkId: segment,
                    type: 'group',
                    item: [],
                    _segment: segment,
                    _path: fullPath,
                    _synthetic: true
                };
                items.push(item);
            }

            return item;
        }


        //create an item from an ED. Note that not all elements are added here - just the ones used in
        //processing. The 'cleanQuestionnaire' routine adds others
        function applySourceToItem(item, ed) {
            item.linkId = utilsSvc.getUUIDHash(ed.id) //ed.linkId || item.linkId;
            item.text = ed.title;


            let vo = getControlDetails(ed)
            item.type = vo.controlType

            if (ed.adHocExtension) {
                item.extension = ed.adHocExtension

            }

           // item.required = src.required;
          //  item.repeats = src.repeats;

            addIfNotEmpty(item,'answerValueSet',ed.valueSet)

            // Stash original source for later resolution
            item._source = ed;
        }

        /* ================================================================
         * enableWhen resolution
         * ================================================================ */

        function resolveEnableWhen(items, pathIndex, idIndex, warnings) {
            items.forEach(item => {

                if (item._source && item._source.enableWhen) {
                    const resolved = item._source.enableWhen
                        .map(cond => resolveEnableWhenCondition(cond, pathIndex, idIndex, warnings))
                        .filter(Boolean);

                    if (resolved.length) {
                        item.enableWhen = resolved;
                        item.enableBehavior = item._source.enableBehavior || 'all';
                    }
                }

                if (item.item && item.item.length) {
                    resolveEnableWhen(item.item, pathIndex, idIndex, warnings);
                }

                delete item._source;
            });
        }

        function resolveEnableWhenCondition(cond, pathIndex, idIndex, warnings) {


            let idOfSource = cond.sourceId
            let target = idIndex[idOfSource]

            //const target = pathIndex.get(cond.source);


            if (!target) {
                warnings.push(`enableWhen target not found: ${cond.source}`);
                return null;
            }

            if (target.type === 'group') {
                warnings.push(`enableWhen targets a group: ${cond.source}`);
                return null;
            }

            return Object.assign(
                { question: target.linkId, operator: cond.operator },
                extractAnswer(cond,warnings)
            );
        }


        //find the answer value that the conditional references
        function extractAnswer(cond,warnings) {
            //the value to compare is in the value. We only support Coding and Boolean in the tooling...
            //it would have been easier to use answer[type] in retrospect
            //warnings.push(`test`)

            let value = cond.value
            if (value) {
                if (value.code) {
                    return {answerCoding: value}
                } else {
                    return {answerBoolean: value}
                }
            } else {
                warnings.push(`${cond.path} conditional as no value`)
                return
            }






            const keys = Object.keys(cond).filter(k => k.startsWith('answer'));

            if (keys.length !== 1) {
              //temp  throw new Error('enableWhen must contain exactly one answer[x]');
            }

            return { [keys[0]]: cond[keys[0]] };

        }

        /* ================================================================
         * Cleanup: remove underscore fields, empty items, prune empty synthetic groups
         * also adds some elements that are not used in this processing
         * ================================================================ */

        function cleanQuestionnaire(questionnaire) {



            function cleanItems(items) {
                if (!items || !items.length) return [];

                return items
                    .map(i => {
                        // Clean children first
                        const childItems = cleanItems(i.item);

                        // Determine if current node is meaningful
                        const isMeaningful = i.linkId && (i.type || childItems.length);

                        if (!isMeaningful) return null;

                        let cleaned = {}
                        for (const key of Object.keys(i)) {
                            if (! key.startsWith("_") && (key !== 'item') ) {
                                cleaned[key] = i[key]
                            }
                        }
/*
                        let cleaned = {
                            linkId: i.linkId,
                            type: i.type,
                            text: i.text
                        };



                        addIfNotEmpty(cleaned,'required',i.required)
                        addIfNotEmpty(cleaned,'repeats',i.repeats)
                        addIfNotEmpty(cleaned,'enableWhen',i.enableWhen)
                        addIfNotEmpty(cleaned,'enableBehavior',i.enableBehavior)
                        addIfNotEmpty(cleaned,'extension',i.extension)


                        addIfNotEmpty(cleaned,'answerValueSet',i.answerValueSet)
*/

                        if (childItems.length) cleaned.item = childItems;

                        return cleaned;
                    })
                    .filter(Boolean); // remove nulls
            }

            const cleanQ = angular.copy(questionnaire);
            cleanQ.item = cleanItems(cleanQ.item);
            return cleanQ;
        }

        function  getControlDetails(ed) {

            //return the control type & hint based on the ed

            let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
            let controlType = "string"          //this has to be one of the defined type values

            if (ed.options && ed.options.length > 0) {
                controlHint = "drop-down"
                controlType = "choice"
            }

            if (ed.type) {
                switch (ed.type[0]) {
                    case 'display' :
                        controlType = "display"
                        controlHint = "display"
                        break
                    case 'string' :
                        controlType = "string"      //default to single text box
                        if (ed.controlHint == 'text') {
                            controlType = "text"
                        }
                        break
                    case 'boolean' :
                        controlHint = "boolean"
                        controlType = "boolean"
                        break
                    case 'decimal' :
                        controlHint = "decimal"
                        controlType = "decimal"
                        break
                    case 'integer' :
                        controlHint = "integer"
                        controlType = "integer"
                        break
                    case 'Quantity' :
                        controlHint = "quantity"
                        controlType = "quantity"
                        if (ed.units) {
                            //p
                            //console.log(ed.units)
                        }
                        break
                    case 'dateTime' :
                        controlHint = "dateTime"
                        controlType = "dateTime"
                        break
                    case 'date' :
                        controlHint = "date"
                        controlType = "date"
                        break
                    case 'CodeableConcept' :
                        //  controltype is always choice. May want typeahead later

                        controlHint = "drop-down"
                        controlType = "choice"

                        if (ed.controlHint ) {
                            controlHint = ed.controlHint
                            //csiro only supports autocomplete on open-choice
                            if (controlHint == 'autocomplete') {
                                controlType = "open-choice"
                            }
                        }
                        break
                    case 'Group' :
                    case 'group' :
                        //sep18controlHint = "display"

                        controlHint = "group"
                        controlType = "group"

                        break
                    /*
                    case 'Identifier' :
                        controlHint = "Identifier"
                        controlType = "Identifier"
*/

                }



            }


            return {controlType:controlType,controlHint:controlHint}
        }


        function addIfNotEmpty(item,eleName,obj) {
            if (obj) {
                item[eleName] = obj
            }
        }

        //generate the high level Questionnaire
        function makeInitialQuestionnaire(dg,config) {
            let questionnaire = {
                resourceType: 'Questionnaire',
                status: 'draft'
            };

            questionnaire.name = config.name || dg.name //firstElement.ed.path
            questionnaire.title = dg.title //firstElement.title
            questionnaire.status = 'active'
            questionnaire.title = dg.title
            questionnaire.date = new Date().toISOString()
            questionnaire.url = config.url
            questionnaire.version = config.version || 'draft'
            questionnaire.description = dg.description
            questionnaire.item = []


            if (dg.termSvr) {
                questionnaire.extension = questionnaire.extension || []
                let ext = {url:extensionUrls.peferredTerminologyServer,valueUrl:dg.termSvr}
                questionnaire.extension.push(ext)
            }

            return questionnaire
        }

    });
