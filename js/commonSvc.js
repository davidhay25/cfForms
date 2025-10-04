/*
* Services used by both requester & lab
*
* */

angular.module("pocApp")

    .service('commonSvc', function($q,$http) {

        let config= {}



        return {


            populate : function(Q,patient,QR) {
                //create a QR based on the input. This is intended to be similar to the SDC populate operation,
                //and it may be that this function is moved to the sever to more properly support this.
                //the QR would be a 'context' in the SDC operation
                //the mapping is based on the item.code element

                //first, get the Q that corr

                //next, create a hash of all the data in the incomming QR (based on item.code)
                let hashInput = {}      //the hash of input data, keyed on code
                function getInput(item) {
                    if (item.code && item.code.length > 0) {
                        //we only use the first code
                        let key = `${item.code[0].system}|${item.code[0].code}`

                        hashInput[key] = item.answer
                    }
                    if (item.item) {
                        item.item.forEach(function (child) {
                            getInput(child)
                        })
                    }
                }

                if (QR.item) {
                    QR.item.forEach(function (section) {
                        getInput(section)
                    })
                }

                console.log(hashInput)

                //now, create the 'output' QR based on the Q and the data in the input QR
                //we assume that the datatype of any items with the same code are the same.




            },

            allQRData : function(qr){
                //add all the data from the QR into a hash by linkId. For the lab report (and other reports)
                let hash = {}

                function addAnswer(item) {
                    if (item.answer) {
                        hash[item.linkId] = item.answer
                    }
                    if (item.item) {
                        item.item.forEach(function (child) {
                            addAnswer(child)
                        })
                    }
                }

                if (qr.item) {
                    qr.item.forEach(function (item) {
                        addAnswer(item)
                    })
                    return hash
                }


            },

            summarizeValidation : function(OO,bundle,Q) {
                //present the validation issues in the OO with the bundle entry

                //create an index of resources in the bundle
                let totalErrors = 0
                let lstResources = []
                let unknownIssues = []      //issues that can't be associated with a specific resource
                let enhancedErrors = []     //errors with improved notification
                let hashQItem = makeQHash(Q)              //a has of Q items used for the improved errors

                //if (! bundle.entry) {
                //    return {}
               // }


                if (bundle && bundle.entry) {
                    bundle.entry.forEach(function (entry,inx) {
                        lstResources.push({resource:entry.resource,pos:inx,issues:[]})
                    })
                }


                //add all the issues in the OO to the list
                if (OO && OO.issue) {
                    OO.issue.forEach(function (iss) {
                        if (iss.location) {
                            let loc = iss.location[0]
                            let ar = loc.split('[')
                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)
                                //console.log(pos,loc)

                                let item = {severity:iss.severity,location:loc,pos:pos,diagnostics:iss.diagnostics}
                                if (iss.severity == 'error') {
                                    totalErrors++
                                    enhancedErrors.push(makeEnhancedError(iss.diagnostics,hashQItem))
                                }

                                let resourceAtIndex = lstResources[pos]
                                if (resourceAtIndex) {
                                    resourceAtIndex.issues.push(item)
                                }



                            } else {
                                unknownIssues.push(iss)
                            }


                        } else {
                            //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                            unknownIssues.push(iss)
                        }

                    })
                }


                return {resources:lstResources,totalErrors:totalErrors,unknownIssues:unknownIssues,enhancedErrors:enhancedErrors}

                //make a more understandable version of an error
                function makeEnhancedError(diagnostics,hash) {
                    let err = {}    //this will be the enhances answer
                    if (diagnostics.indexOf("No response answer found for required item") > -1) {
                        //error like: No response answer found for required item 'indication'
                        let ar = diagnostics.split("'")
                        let linkId = ar[1]
                        let extra = hash[linkId]
                        let display = `The required item '${extra.itemText}' in section '${extra.sectionText}' is missing.`
                        err = {display:display,err:diagnostics,linkId:linkId,extra:extra}
                    }
                    return err
                }

                //make a hash of the Q items used in the enhanced errors
                function makeQHash(Q) {
                    let hash = {}
                    if (Q && Q.item) {
                        Q.item.forEach(function (section) {
                            if (section.item) {
                                section.item.forEach(function (child) {
                                    if (child.item) {
                                        //group
                                        child.item.forEach(function (gc) {
                                            addToHash(gc,section,hash)
                                        })
                                    } else {
                                        //leaf
                                        addToHash(child,section,hash)
                                    }

                                })
                            }

                        })
                    }
                    return hash

                }

                function addToHash(item,section,hash) {
                    let row = {sectionText:section.text,itemText:item.text}
                    hash[item.linkId] = {sectionText:section.text,itemText:item.text}
                }

            },

            //todo - convert to server side function that follows paging...
            retrieveAllDRforPatientDEP : function (patient) {
                let deferred = $q.defer()
                let qry = `${this.config.canShare.fhirServer.url}/DiagnosticReport?patient._id=${patient.id}&_include=DiagnosticReport:result`
                qry += "&_count=50"
                $http.get(qry).then(
                    function(data) {

                        console.log(data.data)
                        //construct array of objects {DR: observations:[], other:[]}
                        let bundle = data.data
                        //construct hash of all resources by type & id
                        let hash = {}
                        if (bundle.entry) {
                            bundle.entry.forEach(function (entry) {
                                let resource = entry.resource
                                let key = resource.resourceType + "/" + resource.id
                                hash[key] = resource

                            })

                            //now create hash of DR reso
                            let arDR = []
                            bundle.entry.forEach(function (entry) {
                                let resource = entry.resource
                                //let key = resource.resourceType + "-" + resource.id
                                if (resource.resourceType == 'DiagnosticReport') {
                                    let item = {DR:resource, observations:[],others:[]}
                                    //now retrieve all the resoult
                                    resource.result.forEach(function (ref) {
                                        //todo - check for others
                                        item.observations.push(hash[ref.reference])
                                    })
                                    arDR.push(item)

                                }

                            })


                            deferred.resolve(arDR)
                            //load all the patients
                        } else {
                            deferred.resolve([])
                        }


                    },function (err) {
                        deferred.reject()
                    }

                )

                return deferred.promise
            },
            createUUIDIdentifier : function() {
                //described in the spec - http://hl7.org/fhir/datatypes.html#Identifier
                return {system:"urn:ietf:rfc:3986",value:`urn:uuid:${this.createUUID()}`}
                
            },
            init : function(){
                //initialization code - returns the env. variables for the server and the customops
                let deferred = $q.defer()
                let that = this

                $http.get("config").then(
                    function(data) {
                        that.config = data.data  // save in service {SERVERBASE: CUSTOMOPS}}
                        deferred.resolve(that.config)
                        //load all the patients

                    },function (err) {
                        deferred.reject()
                    }

                )
                return deferred.promise
            },
            getSRForPatientDEP : function(patientId) {
                let that=this
                let deferred = $q.defer()

                let qry = encodeURIComponent(`ServiceRequest?patient=${patientId}`)
                $http.get(`proxy?qry=${qry}`).then(
                    function (data) {
                        console.log(data.data)
                        deferred.resolve(data.data)
                        // console.log($scope.expandedVS)
                    }, function(err) {
                        deferred.reject(err)
                    }
                )
                /*
                //let url = `${this.config.canShare.fhirServer.url}/Patient`
                let url = `${that.config.SERVERBASE}/ServiceRequest?patient=${patientId}&_count=100`
                $http.get(url).then(
                    function (data) {
                        console.log(url,data.data)
                        deferred.resolve(data.data)

                    }
                ), function(err) {
                    deferred.reject(err)
                }
                */
                return deferred.promise
            },
            getAllPatientsDEP : function() {
                let that=this
                let deferred = $q.defer()
                //let url = `${this.config.canShare.fhirServer.url}/Patient`
                let url = `${that.config.SERVERBASE}/Patient`
                $http.get(url).then(
                    function (data) {
                        let lst = []
                        data.data.entry.forEach(function (entry) {
                            lst.push({display:that.getPatientName(entry.resource),patient:entry.resource})

                        })
                        deferred.resolve(lst)

                    }
                ), function(err) {
                    deferred.reject(err)
                }
                return deferred.promise
            },
            retrieveSRandDetailsDEP : function(SR) {
                let deferred = $q.defer()
                //given an SR, retrieve the associated reesources - QR and DR bundle
                let that = this

                let vo = {}
                //retrieve the referenced QR
                let QRReference
                SR.supportingInfo.forEach(function (si) {
                    if (si.reference.startsWith("QuestionnaireResponse")) {
                        QRReference = si.reference

                    }
                })

                if (QRReference) {
                    //let url = `${that.config.canShare.fhirServer.url}/${QRReference}`

                    let url = `${that.config.SERVERBASE}/${QRReference}`

                    $http.get(url).then(
                        function (data) {
                            vo.QR = data.data

                            //now get any DR/obs. - todo - may need to move to $q.all() if there is more to be done...
                            //let url1 = `${that.config.canShare.fhirServer.url}/DiagnosticReport?based-on=${SR.id}&_include=DiagnosticReport:result`
                            let url1 = `${that.config.SERVERBASE}/DiagnosticReport?based-on=${SR.id}&_include=DiagnosticReport:result`
                            $http.get(url1).then(
                                function (data) {
                                    let obj = {observations:[], other:[]}
                                    if (data.data && data.data.entry) {
                                        data.data.entry.forEach(function (entry) {
                                            let resource = entry.resource
                                            switch (resource.resourceType) {
                                                case "DiagnosticReport" :
                                                    obj.DR = resource
                                                    break
                                                case "Observation" :
                                                    obj.observations.push(resource)
                                                default :
                                                    obj.other.push(resource)
                                            }
                                        })
                                    }


                                    vo.DRobject = obj



                                    deferred.resolve(vo)
                                }, function(err) {
                                    deferred.reject(err)
                                }

                            )

                        }, function(err) {
                            deferred.reject(err)
                        }

                        )
                }



                return deferred.promise
            },

            makeQRDEP : function (Q,formData) {
                //construct a QR
                let QR = {resourceType:"QuestionnaireResponse",questionnaire:Q.url,status:'completed',item:[]}
                QR.id = this.createUUID()


                Q.item.forEach(function (sectionItem) {
                    let sectionRootItem = null
                    sectionItem.item.forEach(function (childItem) {
                        //todo - add group level activity - check for childItem.item and iterate through the grand children
                        if (formData[childItem.linkId]) {
                            //create the answerItem
                            let answerItem = {linkId:childItem.linkId,text:childItem.text,answer:[]}

                            //display depends on item datatype. The default is string...
                            switch (childItem.type)  {
                                case "choice":
                                    //answerItem.answer.push({valueCoding:formData[childItem.linkId]})
                                    answerItem.answer.push(formData[childItem.linkId])
                                    break
                                case "integer":
                                    //answerItem.answer.push({valueCoding:formData[childItem.linkId]})
                                    answerItem.answer.push({valueString:formData[childItem.linkId]})
                                    break
                                default :
                                    answerItem.answer.push({valueString:formData[childItem.linkId]})
                                    break

                            }

                            //have we created the sectionitem yet?
                            if (! sectionRootItem) {
                                //this is the first child entry that has data
                                sectionRootItem = {linkId:sectionItem.linkId,text:sectionItem.text,item:[]}     //create the section answer
                                sectionRootItem.item.push(answerItem)  //add the actual answer
                                QR.item.push(sectionRootItem)   //add the section to the root..

                            } else {
                                sectionRootItem.item.push(answerItem)
                            }
                        }
                    })

                })

                return QR

            },

            getPatientNameDEP : function(patient) {
                let name = ""
                if (patient && patient.name) {
                    //todo look for firstName, lastName etc.
                    name = patient.name[0].text


                }
               // console.log(patient,name)
                return name
            },

            makePOSTEntryDEP :function (resource) {
                //Make a create entry. Assume the resource has an id that is a UUID
                let entry = {}
                entry.fullUrl = "urn:uuid:"+ resource.id
                entry.resource = resource
                entry.request = {method:"POST",url:`${resource.resourceType}`}
                return entry


            },
            createUUID : function() {

                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

        }
    }
)