angular.module('pocApp')
    .service('makeQSvc2', function (utilsSvc,snapshotSvc,makeQSvc2Helper) {

        /* ================================================================
         * Public API
         * ================================================================ */

        //need a better strategy for these extensions
        let extInitialExpressionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        let extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"
        let extDefinitionExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
        let extAllocateIdUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
        let extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
        let extCollapsibleUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible"
        let extEntryFormat = "http://hl7.org/fhir/StructureDefinition/entryFormat"
        let extFhirSDBaseUrl = "http://hl7.org/fhir/StructureDefinition"
        //let extHTMLRender = "http://hl7.org/fhir/StructureDefinition/rendering-xhtml"


        //these are resources that we will automatically add references to patient for
        let resourcesForPatientReference = {}
        resourcesForPatientReference['AllergyIntolerance'] = {path:'patient'}
        resourcesForPatientReference['Observation'] = {path:'subject'}
        resourcesForPatientReference['Condition'] = {path:'subject'}
        resourcesForPatientReference['MedicationStatement'] = {path:'subject'}
        resourcesForPatientReference['Specimen'] = {path:'subject'}
        resourcesForPatientReference['DiagnosticReport'] = {path:'subject'}
        resourcesForPatientReference['ServiceRequest'] = {path:'subject'}
        resourcesForPatientReference['Procedure'] = {path:'subject'}
        resourcesForPatientReference['Task'] = {path:'for'}

        this.buildQuestionnaireFromFlat = function (inItems,dg,config) {
            const warnings = [];
            const pathIndex = new Map();    //a hash of item by path
            const idIndex = {}                 //hash by id - used for conditionals

            let questionnaire = makeInitialQuestionnaire(dg,config,warnings)     //generate the questionnaire


            // create an array with just the ED elements
            let items = []

            inItems.forEach(function(thing,inx) {
                let ed = thing.ed
                if (inx == 0) {
                    ed.type=['display']
                    ed._isMainDG = dg
                }
                items.push(ed)

            })

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
                    applySourceToItem(currentItem, ed,warnings);
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


        //---------- create an item from an ED.

        function applySourceToItem(item, ed,warnings) {

            //console.log('apply',ed)

            //extensions go at the top
            if (ed.adHocExtension) {
                item.extension = ed.adHocExtension
            }

            item.linkId = utilsSvc.getUUIDHash(ed.id) //ed.linkId || item.linkId;
            item.text = ed.title;


            //return the item.type from the ed type. Also returns the DG if this is a contained DG
            let vo = makeQSvc2Helper.getControlDetails(ed)
            item.type = vo.controlType


            if (vo.dg) {
                //this item is the 'header' group for a DG. There may be other DG level elements we want to get
                processDG(vo.dg,item,warnings)

            } else {
                //there's a bug in the modeller where valueset can accidentally be added to a group (when a type is changed from cc to a DT)
                addIfNotEmpty(item,'answerValueSet',ed.valueSet)
            }

            if (ed._isMainDG) {
                //the first entry in the flat list represents the DG. However, it doesn't have all the DG attributes
                //(as the list is actually the snapshot contents). When the items list is created when the builder is
                //invoked, the DG is added to the item so that we can pull them out here. As it starts with '_'
                //it will be removed when the Q is cleaned at the end.
                item.type = 'group'
                processDG(ed._isMainDG,item,warnings)
            }

            if (ed.mult) {
                if (ed.mult.indexOf('..*') > -1) {
                    item.repeats = true
                }

                if (ed.mult.indexOf('1..') > -1) {
                    item.required = true
                }

            }


            //collabsible can be on any group
            if (ed.collapsible) {
                let ext = {url:extCollapsibleUrl}
                ext.valueCode = ed.collapsible
                makeQSvc2Helper.addExtension(item,ext)
            }

            if (ed.options && ed.options.length > 0) {
                let options = []
                for (const opt of ed.options) {
                    options.push({valueCoding:opt})
                }

                item.answerOption = options
            }



            //for the definition we need to add the full url. Right now this is always to a core type - could easily
            //add support for profiles by having the canonical in the ed, and looking for 'http' to see if it's a profile or core
            if (ed.definition) {
                //let originalDefinition = ed.definition
                let ar = ed.definition.split('.')
                let type = ar[0]        //the expression always starts with the type - eg Patient.name.given

                let canonical = `http://hl7.org/fhir/StructureDefinition/${type}#${ed.definition}`
                item.definition = canonical

                if (ed.extractExtensionUrl) {
                    //the definition will be something like Specimen.collection.extension.value
                    let ar1 = item.definition.split('.')
                    ar1[ar1.length-1] = "url"

                  //  if (ar.length > 2) {
                       // ar.splice(-2,2)    //remove the 2 on the end

                       // let url = `${canonical}#${ar.join('.')}.extension.url`


                         makeQSvc2Helper.addFixedValue(item,ar1.join('.'),"String",ed.extractExtensionUrl)
                  //  } else {
                        //errorLog.push({msg:`${ed.path} has an incorrect definition`})
                  //  }

                }

            }

            if (ed.prePop) {
                //pre-population expression
                let ext = {url:extInitialExpressionUrl}
                ext.valueExpression = {language:"text/fhirpath",expression:`${ed.prePop}`}
                item.extension = item.extension || []
                item.extension.push(ext)

            }

            if (ed.placeHolder) {
                let ext = {url:extEntryFormat,valueString:ed.placeHolder}
                makeQSvc2Helper.addExtension(item,ext)
            }

            //specific item processing for each type - like fixed or default values
            makeQSvc2Helper.typeSpecificProcessing(item,ed)

            //other processing for this item - unrelated to the type - like helptext or displaytext
            makeQSvc2Helper.miscProcessing(item,ed)

            // Stash original source for later resolution - used for enableWhen
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
                warnings.push({lvl:'err',msg: `enableWhen target not found: ${cond.source}`});
                return null;
            }

/* - don't know why this is wrong...
            if (target.type === 'group') {
                warnings.push({lvl:'err',msg: `enableWhen targets a group: ${cond.source}`});
                return null;
            }
*/
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
                warnings.push({llv:'err',msg:`${cond.path} conditional as no value`})
                return
            }




/*

            const keys = Object.keys(cond).filter(k => k.startsWith('answer'));

            if (keys.length !== 1) {
              //temp  throw new Error('enableWhen must contain exactly one answer[x]');
            }

            return { [keys[0]]: cond[keys[0]] };
*/
        }

        /* ================================================================
         * Cleanup: remove underscore fields, empty items, prune empty synthetic groups
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

                        if (childItems.length) cleaned.item = childItems;

                        return cleaned;
                    })
                    .filter(Boolean); // remove nulls
            }

            const cleanQ = angular.copy(questionnaire);
            cleanQ.item = cleanItems(cleanQ.item);
            return cleanQ;
        }

        function  getControlDetailsDEP(ed) {

            let containedDG = null

            //return the control type & hint based on the ed
            let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
            let controlType = "string"          //this has to be one of the defined type values

            if (ed.options && ed.options.length > 0) {
                controlHint = "drop-down"
                controlType = "choice"
            }

            if (ed.type) {
                let type = ed.type[0]

                containedDG = snapshotSvc.getDG(ed.type[0])
                if (containedDG) {
                    //this is a contained DG
                    controlHint = "group"
                    controlType = "group"
                } else {
                    switch (type) {
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
            }


            return {controlType:controlType,controlHint:controlHint,dg:containedDG}
        }


        function addIfNotEmpty(item,eleName,obj) {
            if (obj) {
               // console.log(item,obj)
                item[eleName] = obj
            }
        }

        //generate the high level Questionnaire
        function makeInitialQuestionnaire(dg,config,warnings) {
            let questionnaire = {
                resourceType: 'Questionnaire',
                status: 'draft'
            };

            questionnaire.name = config.name || dg.name //firstElement.ed.path
            questionnaire.title = dg.title //firstElement.title
            questionnaire.status = config.status || 'draft'
            questionnaire.title = dg.title
            questionnaire.date = new Date().toISOString()
            questionnaire.url = config.url
            questionnaire.version = config.version || 'draft'
            questionnaire.description = dg.description


            //always create the id for the patient on the Q root. Needed for references
            addExtension(questionnaire,{url:extAllocateIdUrl,valueString:'patientID'})

            addContextExtensions(questionnaire) //extensions that define the launct context


            questionnaire.item = []

/*
            //create a top level group for thq Q
            let top = {text:"Top",type:'group',item:[]}
            questionnaire.item.push(top)
*/
            //temp processDG(dg,questionnaire,warnings)     //attributes like term server defined in the DG
//todo ??? should this just explicitely be the term server




            return questionnaire
        }


        function addContextExtensions(Q) {
            //add the SDC extensions required for pre-pop
            //these are added to the
            Q.extension = Q.extension || []
            addPPExtension("patient","Patient","The patient that is to be used to pre-populate the form")
            addPPExtension("user","Practitioner","The practitioner that is to be used to pre-populate the form")
            // addExtension("encounter","Encounter","The current encounter")


            //let ext = {url:extSourceQuery,valueReference:{reference:"#PrePopQuery"}}

            function addPPExtension(name,type,description) {
                let ext = {url:extLaunchContextUrl,extension:[]}

                ext.extension.push({url:'name',valueCoding:{code:name}})
                ext.extension.push({url:'type',valueCode:type})
                ext.extension.push({url:'description',valueString:description})
                Q.extension.push(ext)
            }
        }

        //processes attributes defined on the DG
        function processDG(dg,item,warnings) {
            //set the preferrred terminology server
            warnings.push({lvl:'info',msg: `Processing DG: ${dg.name}, type: ${dg.type}`});

            if (dg.termSvr) {
                let ext = {url:extensionUrls.peferredTerminologyServer,valueUrl:dg.termSvr}
                addExtension(item,ext)
            }

            //sets the definitionExtract extension that indicates what resource this dg extracts to
            //https://build.fhir.org/ig/HL7/sdc/en/StructureDefinition-sdc-questionnaire-definitionExtract.html

            if (dg.type) {
                let canonical = `http://hl7.org/fhir/StructureDefinition/${dg.type}`

                let ext = {url:extDefinitionExtract,extension:[]}
                ext.extension.push({url:"definition",valueCanonical:canonical})

                //if a patient, then use fullUrl to set the entry.fullUrl to the value of patientID which is always set

                if (dg.type == 'Patient') {
                    ext.extension.push({url:"fullUrl",valueString:"%patientID"})
                }

                addExtension(item,ext)
                warnings.push({lvl:'info',msg: `Setting Extraction type (${dg.type}) for  DG: ${dg.name}`});



                //specific processing for an Observation
                if (dg.type == 'Observation') {
                    //set the status to 'final'
                    let definition = `http://hl7.org/fhir/StructureDefinition/Observation#Observation.status`
                    makeQSvc2Helper.addFixedValue(item,definition,'code','final')



                    if (dg.itemCode) {
                    //this is an itemCode on the DG. It's really only used for observations to set
                    //the Observation.code value. Currently we ignore it otherwise

                        //use the addFixedValue routine to set the value of Observation.code
                        let definition = `http://hl7.org/fhir/StructureDefinition/Observation#Observation.code`

                        makeQSvc2Helper.addFixedValue(item,definition,'CodeableConcept',{coding:[dg.itemCode]})

                      //  hideItem(item) //hide the

                    }
                }


            }

            let resourceType = dg.type
            if (dg.adHocExtension) {
                item.extension = item.extension || []
                item.extension.push(...dg.adHocExtension)
                //there is a wrinkle - if definitionExtract is used to set the context - and maybe a fullUrl
                //to use when referencing, then dg.type *should* be blank (to avoid the extension being added above)
                //in that case the patient reference won't be set. So we'll need to check the adHoc extensions and set the resource type
                for (const ext of dg.adHocExtension){
                    if (ext.url == extDefinitionExtract) {
                        for (const childExt of ext.extension || []) {
                            if (childExt.url == 'definition') {
                                if (childExt.valueCanonical) {
                                    let ar = childExt.valueCanonical.split('/')
                                    if (ar.length > 0) {
                                        resourceType = ar[ar.length-1]
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //sets the reference to the Patient
            if (resourcesForPatientReference[resourceType]) {
                warnings.push({lvl:'info',msg: `Setting patient reference for DG: ${dg.name}, type: ${resourceType}`});
                let elementName = resourcesForPatientReference[resourceType].path
                let definition = `http://hl7.org/fhir/StructureDefinition/${resourceType}#${resourceType}.${elementName}.reference`
                let expression = "%patientID"

                //let fixedValue = null
                makeQSvc2Helper.addFixedValue(item,definition,null,null,expression)
            }

        }

        function hideItemDEP(item) {
            //create a hidden extension and add to the item
            let ext = {url:extHidden,valueBoolean:true}
            addExtension(item,ext)

        }

        //add an extension to the indicated item (or Q)
        function addExtension(item,ext) {
            item.extension = item.extension || []
            item.extension.push(ext)
        }
/*
        //add a fixed value expression to the item (or Q)
        function addFixedValueDEP(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression
            //definition is the path in the resource (added to the 'item.definition' value


            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extDefinitionExtractValue,extension:[]}
            ext.extension.push({url:"definition",valueUri:definition})

            if (value) {
                let child = {url:'fixed-value'}
                child[`value${type}`] = value

                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child.valueExpression = {language:"text/fhirpath",expression:expression}
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }
        */

    });
