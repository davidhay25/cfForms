

angular.module("formsApp")
    .service('renderFormsSvc2', function() {

        //copied from makeQ.svc
        let unknownCodeSystem = "http://example.com/fhir/CodeSystem/example"
        let extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"
        let extPrePopUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"

        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"

        return {
            parseErrorExpression : function (expression,Q) {
                ///\ //Questionnaire.item[0].item[2].extension[1].extension[1]
                console.log(expression)
                let ar = expression.split('.')
                let arPath = []
                for (let i=0; i<ar.length;i++) {
                    let seg = ar[i]
                    if (seg.startsWith('item')) {
                        const match = seg.match(/\[(\d+)\]/); // Extracts number inside brackets
                        if (match) {
                            const index = parseInt(match[1], 10); // Convert to a number
                            console.log(index);
                            arPath.push(index)
                        }
                    }
                }

                let item = Q
                for (let i=0; i<arPath.length;i++) {
                    let seg = arPath[i]
                    item = item.item[seg]


                }

                console.log(item)
                return item



            },

            getExtension : function (element,url,type) {
                //return the value of an extensiop
                let valueType = `value${type}`
                let result = []
                if (element.extension) {
                    for (const ext of element.extension) {
                        if (ext.url == url) {
                            result.push(ext[valueType])
                        }
                    }
                }

                return result

            },

            isEnabled : function (item,hashData) {
                //is this item enabled according to the enableWhen properties
                if (! item.enableWhen) {return}



                //default to 'or' comparison  - todo
                let isEnabled = false
                item.enableWhen.forEach(function (ew) {

                    let value = hashData[ew.question]
                    if (value) {
                        if (ew.answerCoding) {
                            if (value.system == ew.answerCoding.system && value.code == ew.answerCoding.code) {
                                isEnabled = true
                            }
                        }
                    }
                })

                return isEnabled

            },



            createControlList : function (item,hashEd) {
                //create a list of items
                let lst = []
                parseItem(lst,item)
                return lst

                function parseItem(lst,item) {
                    if (item.item && item.item.length > 0) {
                        //this is a group of items
                        let entry = {linkId:item.linkId}
                        entry.title = `${item.text}`
                        entry.type = 'group'
                        entry.item = item
                        entry.ed = hashEd[item.linkId]
                        lst.push(entry)
                        for (const child of item.item) {
                            parseItem(lst,child)
                        }
                    } else {
                        //this is a single item
                        let entry = {linkId:item.linkId}
                        entry.title = `${item.text}`
                        entry.type = 'leaf'
                        entry.item = item
                        entry.ed = hashEd[item.linkId]
                        isFixedCoding(entry)
                        lst.push(entry)
                    }
                }

                function isFixedCoding(entry) {
                    //is there a single option with initialOption set? In that case it's a fixed coding
                    if (entry.item.type == 'choice' && entry.item.answerOption  && entry.item.answerOption.length == 1) {
                        entry.ed = entry.ed || {}
                        entry.ed.fixedCoding = entry.item.answerOption[0].valueCoding
                    }

                }
            },

            makeTreeFromQ : function(Q) {
                // a recursive form of the tree generation
                //todo - create list of pre-pop expressions

                let that = this

                let hashItem = {}
                let treeData = []
                let prepopExpression = []

               // let root = {id:'root',text:Q.title || 'Root',parent:'#',state:{}}
                //treeData.push(root)


                function addItemToTree(parent,item,level,sectionItem) {
                    let idForThisItem =  item.linkId
                    hashItem[item.linkId] = item

                    let thisItem = angular.copy(item)
                    delete thisItem.item

                    let text = item.text || "Unknown text"
                    if (text.length > 50) {
                        text = text.slice(0,47) + "..."
                    }

                    let node = {id:idForThisItem,text:text,parent:parent,data:{section:sectionItem,item:item}}

                    let iconFile = "icons/icon-q-" + item.type + ".png"
                    node.icon = iconFile

                    //---- set style of node
                    let arStyle = []         //the style element to add to the node['a_attr']
                    if (item.enableWhen && item.enableWhen.length > 0) {
                        arStyle.push("text-decoration-line: underline")
                        arStyle.push("text-decoration-style: dotted")
                    }

                    if (item.required) {
                        arStyle.push("font-weight:bold")
                    }

                    //used for fixed values - readOnly also set true
                    if (item.initial) {
                        arStyle.push("color : blue")
                    }

                    //fixed values can be set in multiple ways
                    if (item.answerOption && item.answerOption.length > 0 && item.answerOption[0].initialSelected) {
                        arStyle.push("color : blue")
                    }

                    //process extensions
                    if (item.extension) {
                        for (const ext of item.extension) {
                            if (ext.url == extPrePopUrl && ext.valueExpression) {
                                //this is a prepop expresstion
                                prepopExpression.push({linkId:item.linkId,expression:ext.valueExpression.expression})
                            }

                            if (ext.url == extHidden && ext.valueBoolean) {
                                //this is a hidden element - often with a fixed value...
                                arStyle.push("text-decoration-line: line-through")
                            }
                        }
                    }

                    //create tree attribute node
                    if (arStyle.length > 0) {
                        let style = ""
                        arStyle.forEach(function (s) {
                            style += s + ";"

                        })
                        node['a_attr'] = { "style": style}
                        // console.log(ed.path,style)
                    }


                    //todo at this point the node has been created. We need to see if it is an extension
                    //as the

                    treeData.push(node)

                    //now look at any sub children
                    if (item.item) {
                        item.item.forEach(function (child) {
                            let newLevel = "item"
                            if (child.item) {
                                newLevel = 'group'
                            }
                            addItemToTree(idForThisItem,child,newLevel,sectionItem)
                        })
                    }
                }

                function addQToTree(Q) {
                    //create a parent for this Q
                    //let qParentId = `root`
                    let qParentId = `#`
                    //let node = {id:qParentId,text:Q.title || `q${ctr}`,parent:"root",data:{level:'chapter'}}

                    // treeData.push(node)
                    Q.item.forEach(function (item) {
                        let section = angular.copy(item)
                        delete section.item
                        //section.reviewItem = []
                        addItemToTree(qParentId,item,'section',section)
                    })
                }


                addQToTree(Q)
/*
                //now that we have completed the tree array (and populated hashItem)
                //we can make the conditional display a bit nicer by adding the text for the question

                treeData.forEach(function (node) {
                    if (node.data && node.data.item.enableWhen) {
                        node.data.item.enableWhen.forEach(function (ew) {
                            if (hashItem[ew.question]) {
                                ew.questionText = hashItem[ew.question].text
                            }

                        })
                    }
                })

                */

                return {treeData: treeData,hashItem:hashItem,prepopExpression:prepopExpression}




            },


            createUUID : function() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                })
            }

        }
    })


