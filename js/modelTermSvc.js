//more general reports than just terminology
angular.module("pocApp")

    .service('modelTermSvc', function() {



            return {
                makeCodeSummary : function (hashDG) {
                    //make a summary of all the codes used in the DG.
                    //Examine fixed values, default values, options & Conditionals
                    let hashCode = {}   //key is code|system
                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                        dg.diff.forEach(function (ed) {
                            if (ed.mult !== '0..0') {
                                if (ed.fixedCoding) {
                                    let code = `${ed.fixedCoding.code}|${ed.fixedCoding.system}`
                                    hashCode[code] = hashCode[code] || {display:ed.fixedCoding.display,lst:[]}
                                    let t = hashCode[code]
                                    t.lst.push({code:code, DGName : key,hiddenDGName : key,path:ed.path,type:'fixed'})
                                }
                                if (ed.defaultCoding) {
                                    let code = `${ed.defaultCoding.code}|${ed.defaultCoding.system}`
                                    hashCode[code] = hashCode[code] || {display:ed.defaultCoding.display,lst:[]}
                                    let t = hashCode[code]
                                    t.lst.push({code:code, display:ed.defaultCoding.display,DGName : key,hiddenDGName : key,path:ed.path,type:'default'})
                                }

                                if (ed.options) {
                                    ed.options.forEach(function (opt) {
                                        let code = `${opt.code}|${opt.system}`
                                        hashCode[code] = hashCode[code] || {display:opt.display,lst:[]}
                                        let t = hashCode[code]
                                        t.lst.push({code:code, display:opt.display,DGName : key,hiddenDGName : key,path:ed.path,type:'option'})
                                    })

                                }


                                if (ed.enableWhen) {
                                    ed.enableWhen.forEach(function (ew) {
                                        //ew.value is assumed to be a Coding (could have been better named). Other possible is valueBoolean
                                        if (ew.value ) {
                                            let code = `${ew.value.code}|${ew.value.system}`
                                            hashCode[code] = hashCode[code] || {display:ew.display,lst:[]}
                                            let t = hashCode[code]
                                            t.lst.push({code:code, display:ew.value.display,dg:key,path:ed.path,type:'enableWhen'})
                                        }

                                    })

                                }
                            }
                        })
                    })

                    return hashCode


                },
                makeNotesSummary: function (hashDG,hashComp) {
                    //All the notes fields from the current resources. currently just DG
                    let lstNotes = []
                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                        if (dg.diff) {
                            dg.diff.forEach(function (ed) {
                                if (ed.notes) {
                                    lstNotes.push({hiddenDGName:dg.name,type:'dg',path:ed.path,notes:ed.notes})
                                }
                            })
                        }
                    })
                   return lstNotes

                },
                makeValueSetSummary : function (hashDG,hashComp) {
                    //make a summary of valuesets from DG & comp
                    let hashVS = {}

                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                            dg.diff.forEach(function (ed) {
                                //let item = {}
                                if (ed.mult !== '0..0') {
                                    if (ed.valueSet) {
                                        //hiddenDGName is used when linking to the DG item
                                        let entry = {DGName : dg.name,hiddenDGName : dg.name, path: ed.path}
                                        entry.isValueSet = true
                                        hashVS[ed.valueSet] = hashVS[ed.valueSet] || []

                                        //are there options defined as well?
                                        if (ed.options) {
                                            //yes, add them to the summary
                                            entry.options = ed.options
                                        }
                                        hashVS[ed.valueSet].push(entry)

                                    } else {
                                        if (ed.options && ed.options.length > 0) {
                                            //This is where there are options but no VS

                                            let vsUrlTmp = `${dg.name}-${ed.path}`

                                            let entry = {hiddenDGName : dg.name,DGName : dg.name, path: ed.path}
                                            entry.options = ed.options
                                            hashVS[vsUrlTmp] = hashVS[vsUrlTmp] || []
                                            hashVS[vsUrlTmp].push(entry)
                                        }
                                    }
                                }

                            })
                    })
/*
                    //now check the composition overrides
                    //todo - We aren't using this any more
                    Object.keys(hashComp).forEach(function (key) {
                        let comp = hashComp[key]
                        //let item = {compName: comp.name}

                        if (comp.override) {
                            Object.keys(comp.override).forEach(function (key) {
                                let ov = comp.override[key]
                                let vs = ov.valueSet

                                if (vs) {
                                    let entry = {compName : comp.name, path: key}

                                    hashVS[vs] = hashVS[vs] || []
                                    //are there optyions defined as well?
                                    if (ov.options) {
                                        //yes, add them to the summary
                                        entry.options = ov.options
                                    }
                                    hashVS[vs].push(entry)

                                } else {
                                    if (ov.options) {
                                        //This is where there are options but no VS
                                        let vsUrlTmp = `${comp.name}-${key}`
                                        let entry = {compName : comp.name, path: key}
                                        entry.options = ov.options
                                        hashVS[vsUrlTmp] = hashVS[ov.valueSet] || []
                                        hashVS[vsUrlTmp].push(entry)
                                    }
                                }


                            })
                        }

                    })
                    */

                    //convert to an array and sort
                    let arVS = []
                    Object.keys(hashVS).forEach(function (key) {
                        let item = hashVS[key]
                        item.url = key
                        if (key.indexOf(' ') > -1) {
                            item.issue = true
                        }
                        arVS.push(item)
                    })

                    arVS.sort(function (a,b) {
                        try {
                            if (a.url.toUpperCase() > b.url.toUpperCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        } catch (ex) {
                            return 0
                        }

                    })

                    return {hashVS:hashVS,arVS:arVS}

                },
                makeCompOverrideSummary : function (hashComp) {
                    //make a summary of the composition overrides. This includes Z elements
                    let ar = []
                    Object.keys(hashComp).forEach(function (key) {
                        let comp = hashComp[key]
                        let item = {compName: comp.name}
                        ar.push(item)
                        if (comp.override) {
                            Object.keys(comp.override).forEach(function (key) {
                                let ov = comp.override[key]
                                //for now, just copy the override element (an ED) across
                                let item = {ov:ov}
                                ar.push(item)
                            })
                        }

                        })


                    return {list:ar}

                },
                makeDGSummary : function (hashDG) {
                    //create a summary array for coded items in a DG.
                    let ar = []
                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                        let item = {}
                        item.DGName = dg.name
                        item.DGTitle = dg.title
                        ar.push(item)
                        dg.diff.forEach(function (ed) {
                            if (ed.type[0] == 'CodeableConcept') {
                                //console.log(ed.type[0])
                                let item = {}
                                item.type = ed.type[0]
                                item.hiddenDGName = dg.name         //needed when al element is selected in the table
                                //item.DGTitle = dg.title
                                item.path = ed.path
                                item.title = ed.title
                                item.description = ed.description
                                item.valueSet = ed.valueSet
                                item.options = ed.options

                                ar.push(item)


                            }
                        })


                    })


                    return {list:ar}

                    //DG, name

                }


            }
        }
    )