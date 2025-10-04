angular.module("pocApp")

    .service('questionnaireSvc', function($q,$http) {
        extItemControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extUrlObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
        extResourceReference = "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource"
        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"


        //todo fsh doesn't underatnd expression extension...
        //extPrepop = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-prepop"

        extPrepop = "http://canshare.com/fhir/StructureDefinition/sdc-questionnaire-initialExpression"

        extExtractNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNotes"
        extExtractPath = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractPath"
        extExtractType = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractType"
        extExtractNone = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNone"

        extUsageNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-usageNotes"

        extVerification= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-verification"
        extNotes= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-notes"

        extSourceStandard = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-sourceStandard"

        extHisoClass = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-class"
        extHisoLength = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-length"
        extHisoDT = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-dt"
        extHisoLayout = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-layout"

        extColumn = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column"
        extColumnCount = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"
        extDescription = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-item-description"

        // extAuthor = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-author"
        extQAttachment = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-attachment"
        extHL7v2Mapping = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-v2mapping"
        extCheckOutQ = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-check-out"

        extHisoStatus = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hisostatus"
        extHisoUOM = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-unit-of-measure"

        extFolderTag = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-folder-tag"

        extPlaceholder = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-placeholder"
        extExclude = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-exclude"


        return {
            getCodedItems : function(Q) {

            },
            buildResourceTree: function (resource) {
                //pass in a resource instance...
                if (! resource) {
                    //function is called when clicking on the space between resources...
                    return;
                }
                var tree = [];
                var idRoot = 0;
                //console.log(resource)
                function processNode(tree, parentId, element, key, level,pathRoot) {

                    if (angular.isArray(element)) {
                        var aNodeId1 = getId()
                        var newLevel = level++;
                        var data = {key:key, element:element,level:newLevel,path:pathRoot+'.'+key}
                        var newNode1 = {id: aNodeId1, parent: parentId, data:data, text: key, state: {opened: true, selected: false}};
                        tree.push(newNode1);

                        newLevel++
                        element.forEach(function (child, inx) {
                            processNode(tree, aNodeId1, child, '[' + inx + ']',newLevel,pathRoot+'.'+key);
                        })

                    } else if (angular.isObject(element)) {
                        var newLevel = level++;
                        var oNodeId = getId();
                        var data = {key:key, element:element,level:newLevel,path:pathRoot+'.'+key}
                        var newNode2 = {id: oNodeId, parent: parentId, data: data, text: key, state: {opened: true, selected: false}};



                        tree.push(newNode2);

                        //var newLevel = level++;
                        newLevel++
                        angular.forEach(element, function (child, key1) {
                            processNode(tree, oNodeId, child, key1,newLevel,pathRoot+'.'+key);

                        })
                    } else {
                        //a simple element
                        if (key == 'div') {

                        } else {

                            //console.log(key,element)
                            //http://itsolutionstuff.com/post/angularjs-how-to-remove-html-tags-using-filterexample.html
                            //strip out the html tags... - elemenyt is not always a string - bit don't care...
                            try {
                                if (element.indexOf('xmlns=')>-1) {
                                    element = element.replace(/<[^>]+>/gm, ' ')
                                }
                            } catch (ex) {

                            }



                            var display = key + " " + '<strong>' + element + '</strong>';
                            var data = {key:key, element:element,level:level,path:pathRoot+'.'+key}
                            //data.element = element;
                            var newNode = {
                                id: getId(),
                                parent: parentId,
                                data:data,
                                text: display,
                                state: {opened: true, selected: false}
                            };
                            tree.push(newNode);
                        }
                    }
                }


                var rootId = getId();
                var rootItem = {id: rootId, parent: '#', text: resource.resourceType, state: {opened: true, selected: true}}
                tree.push(rootItem);

                angular.forEach(resource, function (element, key) {
                    processNode(tree, rootId, element, key, 1,resource.resourceType);
                });

                //var parentId = '#';
                return tree;

                //generate a new ID for an element in the tree...
                function getId() {
                    idRoot++;
                    return idRoot;

                }


            },

            findExtension : function(item,url) {
                //return an array with all matching extensions
                let ar = []

                if (item && item.extension) {
                    for (var i=0; i <  item.extension.length; i++){
                        let ext = item.extension[i]
                        if (ext.url == url) {
                            ar.push(ext)
                        }
                    }
                }
                return ar

            },
            getMetaInfoForItem : function(item) {
                //populate meta info - like resource extraction. Basically pull all extensions into a VO
                var that = this
                let meta = {}



                //update the Observationextract
                let ar = this.findExtension(item,extUrlObsExtract)
                if (ar.length > 0 ) {
                    if (ar[0].valueBoolean) {
                        meta.extraction = meta.extraction || {}
                        meta.extraction.extractObservation = true
                    }
                }

                //now look for any extraction notes
                let ar1 = this.findExtension(item,extExtractNotes)
                if (ar1.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.notes = ar1[0].valueString
                }

                let ar1b = this.findExtension(item,extExtractPath)
                if (ar1b.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.path = ar1b[0].valueString
                }

                let ar1c = this.findExtension(item,extExtractType)
                if (ar1c.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.type = ar1c[0].valueString
                }

                let ar1d = this.findExtension(item,extExtractNone)
                if (ar1d.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.none = ar1d[0].valueBoolean
                }


                //now look for description
                let arDesc = this.findExtension(item,extDescription)
                if (arDesc.length > 0) {

                    meta.description = arDesc[0].valueString
                }

                //and usage notes
                let ar2 = this.findExtension(item,extUsageNotes)
                if (ar2.length > 0) {
                    //meta.extraction = meta.extraction || {}
                    meta.usageNotes = ar2[0].valueString
                }

                //and reference types
                let ar3 = this.findExtension(item,extResourceReference)

                if (ar3.length > 0) {
                    meta.referenceTypes = meta.referenceTypes || []
                    ar3.forEach(function (ext) {
                        meta.referenceTypes.push(ext.valueCode)
                    })
                }

                //and source standard
                let ar4 = this.findExtension(item,extSourceStandard)
                if (ar4.length > 0) {
                    meta.sourceStandard = ar4[0].valueString
                }

                //display col - column number, 1 based
                let ar5 = this.findExtension(item,extColumn)
                if (ar5.length > 0) {
                    meta.column = ar5[0].valueInteger
                }

                //column count
                // meta.columnCount = 2       //default column count

                let ar6 = this.findExtension(item,extColumnCount)
                if (ar6.length > 0) {
                    meta.columnCount = ar6[0].valueInteger
                }

                //form control
                let ar7 = this.findExtension(item,extItemControl)
                if (ar7.length > 0) {
                    meta.itemControl = ar7[0].valueCodeableConcept

                    //set the element 'renderVS' to the code. Used when rendering a valueset
                    if (meta.itemControl.coding) {
                        meta.renderVS = meta.itemControl.coding[0].code
                    }
                }

                //hidden
                let ar8 = this.findExtension(item,extHidden)
                if (ar8.length > 0) {
                    meta.hidden = ar8[0].valueBoolean
                }

                let ar11 = this.findExtension(item,extHisoLength)
                if (ar11.length > 0) {
                    meta.hisoLength= ar11[0].valueInteger
                }

                let ar12 = this.findExtension(item,extHisoDT)
                if (ar12.length > 0) {
                    meta.hisoDT= ar12[0].valueString
                }

                let ar13 = this.findExtension(item,extHisoLayout)
                if (ar13.length > 0) {
                    meta.hisoLayout= ar13[0].valueString
                }


                let ar14 = this.findExtension(item,extVerification)
                if (ar14.length > 0) {
                    meta.verification = ar14[0].valueString
                }

                let ar15 = this.findExtension(item,extNotes)
                if (ar15.length > 0) {
                    meta.notes= ar15[0].valueString
                }

                let ar16 = this.findExtension(item,extHL7v2Mapping)
                if (ar16.length > 0) {
                    meta.v2mapping= ar16[0].valueString
                }

                let ar17 = this.findExtension(item,extHisoUOM)
                if (ar17.length > 0) {
                    meta.UOM = ar17[0].valueString
                }

                //updateExtension(item,extHL7v2Mapping,"String",meta.v2mapping)

                let ar18 = this.findExtension(item,extPlaceholder)
                if (ar18.length > 0) {
                    meta.placeholder = ar18[0].valueString
                }

                let ar19 = this.findExtension(item,extExclude)
                if (ar19.length > 0) {
                    meta.exclude = ar19[0].valueBoolean
                }


                return meta

                function getSingleExtValueTypeDEP(meta,item,url,type) {
                    let ar = that.findExtension(item,url)
                    if (ar.length > 0) {
                        let v = ar[0]
                        return v[type]
                    }
                }
            },

            makeQrSummary : function (QR,Q) {
                //a list view for the QR.
                //options = options || {}     //display options - not currently used...
                //let hashEnableWhen = {} //key is the element with EW set, value is the item they are dependant on

                let lstAnswers = []

                //create a hash of the Q items so can add to tree //todo - should this be done externally
                let hashQ = {}
                if (Q && Q.item) {
                    Q.item.forEach(function (section) {
                        let cloneSection = angular.copy(section)
                        delete cloneSection.item
                        hashQ[section.linkId] = cloneSection
                        if (section.item) {
                            section.item.forEach(function (child) {
                                let cloneChild = angular.copy(child)
                                delete cloneChild.item
                                hashQ[child.linkId] = cloneChild
                                if (child.item) {
                                    child.item.forEach(function (gc) {
                                        hashQ[gc.linkId] = gc
                                    })
                                }
                            })
                        }
                    })
                }


                if (QR.item) {
                    QR.item.forEach(function(sectionItem){
                        //sections never have answers
                        lstAnswers.push({section:sectionItem.text})
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (child,childInx) {

                                if (child.answer) {
                                    let vo = {linkId: child.linkId, answer : child.answer,qItem:hashQ[child.linkId] }
                                    lstAnswers.push(vo)
                                }

                                //third level - the contents of a group...
                                if (child.item) {
                                    child.item.forEach(function (gc) {
                                        if (gc.answer) {
                                            let vo = {linkId: gc.linkId, answer : gc.answer,qItem:hashQ[gc.linkId] }
                                            lstAnswers.push(vo)
                                        }
                                    })
                                }
                            })
                        }
                    })
                }




                return lstAnswers

            },

            makeTreeFromQr : function (QR,Q) {
                //a tree view for the QR. similar to Q but also has the Q item that defines the QR item
                //specifically 3 levels. Not recursive
                //levels root, section, child, grandchild
                //options = options || {}     //display options - not currently used...
                //let hashEnableWhen = {} //key is the element with EW set, value is the item they are dependant on
                let that = this

                //create a hash of the Q items so can add to tree //todo - should this be done externally
                let hashQ = {}
                if (Q && Q.item) {
                    Q.item.forEach(function (section) {
                        let cloneSection = angular.copy(section)
                        delete cloneSection.item
                        hashQ[section.linkId] = cloneSection
                        if (section.item) {
                            section.item.forEach(function (child) {
                                let cloneChild = angular.copy(child)
                                delete cloneChild.item
                                hashQ[child.linkId] = cloneChild
                                if (child.item) {
                                    child.item.forEach(function (gc) {
                                        hashQ[gc.linkId] = gc
                                    })
                                }
                            })
                        }
                    })
                }

                //let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                let treeData = []
                let hash = {}
                let root = {id:'root',text:'Root',parent:'#',state:{},data:{level:'root'}}
                treeData.push(root)

                if (QR.item) {
                    QR.item.forEach(function(sectionItem){
                        //each top level item is a section
                        let item = {id: sectionItem.linkId,state:{},data:{}}
                        item.text = sectionItem.text //+ " " + treeData.length;
                        item.parent = "root";
                        item.icon = "icons/icon-qi-horizontal.png"
                        //let meta = that.getMetaInfoForItem(sectionItem)
                        let qItem = angular.copy( hashQ[sectionItem.linkId])
                        delete qItem.item
                        item.data = {item:sectionItem,level:'section',qItem :qItem}

                        //item.answerValueSet = sectionItem.answerValueSet
                        // why do I need this?item.data.description = getDescription(parentItem)

                        hash[item.id] = item.data;
                        treeData.push(item)

                        //second layer - contents of each section
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (child,childInx) {
                                let item = {id: child.linkId,state:{},data:{}}
                                item.text = child.text || child.linkId //+ " " + treeData.length;
                                item.parent = sectionItem.linkId;
                                //let meta = that.getMetaInfoForItem(child)
                                let qItem = angular.copy( hashQ[child.linkId])
                                delete qItem.item
                                item.data = {item:child,level:'child',qItem:qItem,parentItem : sectionItem, parentItemInx:childInx} //child

                                let iconFile = "icons/icon-q-" + child.type + ".png"
                                item.icon = iconFile

                                hash[item.id] = item.data;
                                treeData.push(item)


                                //third level - the contents of a group...
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        let item = {id: grandchild.linkId, state: {}, data: {}}
                                        item.text = grandchild.text || grandchild.linkId//+ " " + treeData.length;
                                        item.parent = child.linkId;

                                        let iconFile = "icons/icon-q-" + grandchild.type + ".png"
                                        item.icon = iconFile

                                        //item.icon = "icons/icon_q_item.png"
                                        let meta = that.getMetaInfoForItem(grandchild)
                                        item.data = {item: grandchild, level: 'grandchild', qItem:hashQ[grandchild.linkId]} //child

                                        hash[grandchild.id] = grandchild.data;
                                        treeData.push(item)
                                    })
                                }
                            })
                        }
                    })
                }




                return {treeData : treeData,hash:hash}

            },

            makeTreeFromQ : function (Q,options) {
                //specifically 3 levels. Not recursive
                //levels root, section, child, grandchild
                options = options || {}     //display options - not currently used...
                let hashEnableWhen = {} //key is the element with EW set, value is the item they are dependant on
                let that = this
                //let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                let treeData = []
                let hash = {}
                let root = {id:'root',text:'Root',parent:'#',state:{},data:{level:'root'}}
                treeData.push(root)

                if (Q.item) {
                    Q.item.forEach(function(sectionItem){
                        //each top level item is a section
                        let item = {id: sectionItem.linkId,state:{},data:{}}
                        item.text = sectionItem.text //+ " " + treeData.length;
                        item.parent = "root";
                        item.icon = "icons/icon-qi-horizontal.png"
                        let meta = that.getMetaInfoForItem(sectionItem)
                        item.data = {item:sectionItem,level:'section',meta:meta}

                        item.answerValueSet = sectionItem.answerValueSet
                        // why do I need this?item.data.description = getDescription(parentItem)

                        hash[item.id] = item.data;
                        treeData.push(item)

                        //second layer - contents of each section
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (child,childInx) {
                                let item = {id: child.linkId,state:{},data:{}}
                                item.text = child.text || child.linkId //+ " " + treeData.length;
                                item.parent = sectionItem.linkId;
                                let meta = that.getMetaInfoForItem(child)
                                item.data = {item:child,level:'child',meta:meta,parentItem : sectionItem, parentItemInx:childInx} //child

                                let iconFile = "icons/icon-q-" + child.type + ".png"
                                item.icon = iconFile

                                hash[item.id] = item.data;
                                treeData.push(item)
                                // not sure what this was checkEnableWhen(child)

                                //third level - the contents of a group...
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        let item = {id: grandchild.linkId, state: {}, data: {}}
                                        item.text = grandchild.text || grandchild.linkId//+ " " + treeData.length;
                                        item.parent = child.linkId;

                                        let iconFile = "icons/icon-q-" + grandchild.type + ".png"
                                        item.icon = iconFile

                                        //item.icon = "icons/icon_q_item.png"
                                        let meta = that.getMetaInfoForItem(grandchild)
                                        item.data = {item: grandchild, level: 'grandchild', meta:meta} //child

                                        hash[grandchild.id] = grandchild.data;
                                        treeData.push(item)
                                        // not sure why this wascheckEnableWhen(grandchild)
                                    })
                                }

                            })

                        }

                    })
                }




                return {treeData : treeData,hash:hash}


                function checkEnableWhenDEP(item) {
                    if (item.enableWhen) {
                        hashEnableWhen[item.linkId] = item.enableWhen[0].question
                    }
                }


                function getDescriptionDEP(item) {
                    //let extUrl = "http://clinfhir.com/structureDefinition/q-item-description"
                    let v = ""
                    if (item.extension) {
                        item.extension.forEach(function (ext) {
                            if (ext.url == extDescription ) {

                                v = ext.valueString
                            }
                        })
                    }
                    return v
                }

                function makeMultDEP(item) {
                    let mult = ""
                    if (item.required) {
                        mult = "1.."
                    } else {
                        mult = "0.."
                    }

                    if (item.repeats) {
                        mult += "*"
                    } else {
                        mult += "1"
                    }
                    return mult
                }

            }

        }
    }
)