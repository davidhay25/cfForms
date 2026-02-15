angular.module("pocApp")

    .service('modelReviewSvc', function(utilsSvc,makeQHelperSvc) {

        let config = {}
        let cmConfig = {}

        let extensionUrls = makeQHelperSvc.getExtensionUrls()

        return {

            makeExtractSummary : function (Q) {
                //create a summary object for displaying extracted resources from a Q


                //function processItem


            },
            makeTableData : function (Q) {
                //create a list for a table view of the Q

                let lst = []

                function processItem(item,level) {
                    item.level = level
                    lst.push(item)
                    if (item.item) {
                        let childLevel = level +1
                        for (const child of item.item) {
                            processItem(child,childLevel)
                        }
                    }
                }

                if (Q.item) {
                    for (const child of Q.item) {
                        processItem(child,1)
                    }
                }

                return lst



            },
            makeDG: function(Q){
                //create a DG from a Q
                //currently only used when importing ICCR

                //hash keyed on linkId to id. needed in EnableWhen
                //todo - assumption that an enablewhen always refers to something earlier in the Q - may need to revisit
                //todo - potentially a 2 pass process is required - create dg first, then add EW after

                let hashLinkId = {}

                let dg = {kind:'dg',id: 'newdg', name:Q.name,title:Q.title,active:true}

                dg.id = utilsSvc.getUUID()
                dg.diff = []
                function processItem(item,parentPath) {

                    let ed = {}
                    ed.id = utilsSvc.getUUID()
                    hashLinkId[item.linkId] = ed.id


                    //set the ed type from the item type
                    //todo - could be an externa; function - and add the others......
                    let edType = 'string'
                    switch (item.type) {
                        case "integer" :
                            edType = "integer"
                            break
                        case "decimal" :
                            edType = "decimal"
                            break
                    }


                    ed.type = [edType]


                    ed.mult = '0..'
                    if (item.required) {
                        ed.mult = '1..'
                    }

                    if (item.repeats) {
                        ed.mult += '*'
                    } else {
                        ed.mult += '1'
                    }

                    if (item.code) {
                        ed.itemCode = item.code[0]
                    }

                    if (item.enableWhen) {
                        ed.enableWhen = []
                        for (const ew of item.enableWhen) {
                            if (ew.answerCoding) {
                                //only support answerCoding
                                ed.enableWhen = ed.enableWhen || []
                                let dgEW = {source:ew.question,operator:ew.operator}
                                dgEW.value = ew.answerCoding
                                dgEW.sourceId = hashLinkId[ew.question] //the unique id of the controller



                                ed.enableWhen.push(dgEW)
                            }
                        }
                    }

                    //ed.mult = '0..1'

                    switch (item.type) {
                        case 'choice' :
                            ed.type = ['CodeableConcept']
                            break
                    }
                    ed.path = item.linkId
                    if (parentPath) {
                        ed.path = `${parentPath}.${item.linkId}`
                    }

                    let ar = item.text.split('-')
                    ed.title = ar[0]
                    ed.description = ar[1]

                    if (item.answerOption) {
                        ed.options = []
                        for (const ao of item.answerOption) {
                            if (ao.valueCoding) {
                                let concept = {code:ao.valueCoding.code,display:ao.valueCoding.display}
                                concept.system = ao.valueCoding.system
                                ed.options.push(concept)
                            }
                        }
                    }

                    if (item.extension) {
                        for (const ext of item.extension) {

                            switch (ext.url) {
                                case extensionUrls.itemControl :
                                    if (ext.valueCodeableConcept && ext.valueCodeableConcept.coding) {
                                        if (ext.valueCodeableConcept.coding[0].code == 'radio-button') {
                                            ed.controlHint = 'radio'
                                        }
                                    }
                                    break

                            }

                        }
                    }



                    dg.diff.push(ed)


                    if (item.item) {
                       // ed.type = ['group']

                        for (let child of item.item) {
                            processItem(child,ed.path)

                        }
                    }


                }

                if (Q.item) {
                    let parentPath = ""
                    for (let child of Q.item) {
                        processItem(child,parentPath)
                    }
                }

                return {dg:dg}


            },
            convertICCR: function(Q,makeGroup,source){
                //convert an ICCR sourced Q (R5) to R4 (at least the bits I care about)
                //todo - need to think of the best way to do this
                //if makeGroup true, then if a non-group has child items, they are all pushed into a separate group type parent
                makeGroup = false //disable make group for now
                let log = []

                function processItem(item) {
                    if (item.type) {
                        if (item.type == 'coding') {
                            item.type = 'choice'
                            log.push({linkId : item.linkId,msg:"Changed type from 'coding' to 'choice'"})
                        }
                    } else {
                        item.type = "string"
                        log.push({linkId : item.linkId,msg:"Missing item.type"})
                    }

                    if (item.answerConstraint) {
                        delete item.answerConstraint
                        log.push({linkId : item.linkId,msg:"Deleted item.answerConstraint"})
                    }
/*
                    if (makeGroup && item.item && item.type !== 'group') {
                        //if the item has children and is not a group, then create a group and add the item to it
                        let clone = angular.copy(item)
                        delete clone.item

                        item.type = 'group'
                        item.linkId = utilsSvc.getUUID()
                        delete item.answerOption
                        delete item.code

                        item.item.splice(0,0,clone)

                    }
*/



                    if (item.item) {
                        for (let child of item.item) {
                            processItem(child)
                        }
                    }

                }

                delete Q.meta   //there's a profile in there

                Q.publisher="RCPA"

                let name = 'noname'
                if (Q.title) {
                    name = Q.title.replace(/\s+/g, "")
                    name = name.replace(/:/g, "")
                }
                Q.name = name
                Q.id = `canshare-rcpa-${name}`

                if (! Q.url) {


                    Q.url = `http://canshare.co.nz/fhir/questionnaire/rcpa-${name}`
                    log.push({linkId : 'root',msg:`Set url to ${Q.url}`})
                }


                if (Q.item) {
                    for (let child of Q.item) {
                        processItem(child)
                    }
                }

                return {Q:Q,log:log}

            }
        }
    })
