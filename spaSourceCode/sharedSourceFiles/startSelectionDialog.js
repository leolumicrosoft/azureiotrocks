const globalCache = require("./globalCache")
const simpleSelectMenu=require("./simpleSelectMenu")
const msalHelper=require("../msalHelper")
const editProjectDialog=require("./editProjectDialog")
const modelManagerDialog = require("./modelManagerDialog")
const modelAnalyzer = require("./modelAnalyzer")

function startSelectionDialog() {
    if(!this.DOM){
        this.DOM = $('<div style="position:absolute;top:50%;background-color:white;left:50%;transform: translateX(-50%) translateY(-50%);z-index:99" class="w3-card-2"></div>')
        $("body").append(this.DOM)
        this.DOM.hide()
        globalCache.makeDOMDraggable(this.DOM)
    }
}

startSelectionDialog.prototype.popup = async function() {
    this.DOM.show()
    this.DOM.empty()

    this.contentDOM = $('<div style="width:680px"></div>')
    this.DOM.append(this.contentDOM)
    var titleDiv=$('<div style="height:40px" class="w3-bar w3-red"><div class="w3-bar-item" style="font-size:1.5em">Select Twins</div></div>')
    this.contentDOM.append(titleDiv)
    var closeButton = $('<button class="w3-bar-item w3-button w3-right" style="font-size:2em;padding-top:4px">×</button>')
    titleDiv.append(closeButton)

    this.buttonHolder = $("<div style='height:100%'></div>")
    titleDiv.append(this.buttonHolder)
    closeButton.on("click", () => {
        this.useStartSelection("append")
        this.closeDialog() 
    })

    var row1=$('<div class="w3-bar" style="padding:2px"></div>')
    this.contentDOM.append(row1)
    var lable=$('<div class="w3-bar-item w3-opacity" style="padding-right:5px;">Project </div>')
    row1.append(lable)
    var switchProjectSelector=new simpleSelectMenu(" ",{withBorder:1,colorClass:"w3-light-gray",buttonCSS:{"padding":"5px 10px"}})
    this.switchProjectSelector=switchProjectSelector
    row1.append(switchProjectSelector.DOM)
    var joinedProjects=globalCache.accountInfo.joinedProjects
    joinedProjects.forEach(aProject=>{
        var str = aProject.name
        if(aProject.owner!=globalCache.accountInfo.accountID) str+=" (from "+aProject.owner+")"
        switchProjectSelector.addOption(str,aProject.id)
    })
    switchProjectSelector.callBack_clickOption=(optionText,optionValue)=>{
        switchProjectSelector.changeName(optionText)
        this.chooseProject(optionValue)
    }

    this.editProjectBtn=$('<a class="w3-bar-item w3-button" href="#"><i class="fa fa-edit fa-lg"></i></a>')
    this.deleteProjectBtn=$('<a class="w3-button" href="#"><i class="fa fa-trash fa-lg"></i></a>')
    this.newProjectBtn=$('<a class="w3-button" href="#"><i class="fa fa-plus fa-lg"></i></a>')
    row1.append(this.editProjectBtn,this.deleteProjectBtn,this.newProjectBtn)

    var panelHeight=400
    var row2=$('<div class="w3-cell-row"></div>')
    this.contentDOM.append(row2)
    var leftSpan=$('<div style="padding:5px;width:260px;padding-right:5px;overflow:hidden"></div>')
    row2.append(leftSpan)
    this.leftSpan=leftSpan

    var rightSpan=$('<div class="w3-container w3-cell" style="padding-top:10px;"></div>')
    row2.append(rightSpan) 
    rightSpan.append($('<div class="w3-container w3-card" style="color:gray;height:'+(panelHeight-10)+'px;overflow:auto;width:390px;"></div>'))
    var selectedTwinsDOM=$("<table style='width:100%'></table>")
    selectedTwinsDOM.css({"border-collapse":"collapse"})
    rightSpan.children(':first').append(selectedTwinsDOM)
    this.selectedTwinsDOM=selectedTwinsDOM 

    var row1=$("<div style='margin:8px 0px;font-weight:bold;color:gray;display:flex;align-items:center;height:24px'></div>")
    this.leftSpan.append(row1)
    row1.append($('<label style="padding-right:5px">Choose twins</label>'))

    var radioByModel=$('<input type="radio" name="SelectTwins" value="model" checked><label style="font-weight:normal;padding-right:8px">By Model</label>')
    var radioBTag=$('<input type="radio" name="SelectTwins" value="tag"><label  style="font-weight:normal">By Tag</label>')
    row1.append(radioByModel,radioBTag)
    radioBTag.on("change",(e)=>{this.chooseTwinBy="tag"; this.fillAvailableTags() })
    radioByModel.on("change",(e)=>{this.chooseTwinBy="model"; this.fillAvailableModels() })
    
    this.modelsCheckBoxes=$('<form class="w3-container w3-border" style="height:'+(panelHeight-40)+'px;overflow:auto"></form>')
    leftSpan.append(this.modelsCheckBoxes)
    
    if(this.previousSelectedProject!=null){
        switchProjectSelector.triggerOptionValue(this.previousSelectedProject)
    }else{
        switchProjectSelector.triggerOptionIndex(0)
    }

    radioByModel.trigger("change") 
}

startSelectionDialog.prototype.chooseProject = async function (selectedProjectID) {
    this.buttonHolder.empty()

    var projectInfo=globalCache.findProjectInfo(selectedProjectID)
    if(projectInfo.owner==globalCache.accountInfo.accountID){
        this.editProjectBtn.show()
        this.deleteProjectBtn.show()
        this.editProjectBtn.on("click", () => { editProjectDialog.popup(projectInfo) })
        this.deleteProjectBtn.on("click",async ()=>{
            try {
                await msalHelper.callAPI("accountManagement/deleteProjectTo", "POST", {"projectID":selectedProjectID})
            } catch (e) {
                console.log(e)
                if (e.responseText) alert(e.responseText)
                return
            }
        })
    }else{
        this.editProjectBtn.hide()
        this.deleteProjectBtn.hide()
    }
    this.newProjectBtn.on("click",async ()=>{
        var tsStr=(new Date().toLocaleString()) 
        try {
            var newProjectInfo = await msalHelper.callAPI("accountManagement/newProjectTo", "POST", { "projectName": "New Project " + tsStr })
            globalCache.accountInfo.joinedProjects.unshift(newProjectInfo)
            this.switchProjectSelector.clearOptions()
            var joinedProjects = globalCache.accountInfo.joinedProjects
            joinedProjects.forEach(aProject => {
                var str = aProject.name
                if(aProject.owner!=globalCache.accountInfo.accountID) str+=" (from "+aProject.owner+")"
                this.switchProjectSelector.addOption(str, aProject.id)
            })
            //NOTE: must query the new joined projects JWT token again
            await msalHelper.reloadUserAccountData()
            this.switchProjectSelector.triggerOptionIndex(0)
        } catch (e) {
            console.log(e)
            if (e.responseText) alert(e.responseText)
            return
        }
    })
    

    if(this.previousSelectedProject==null){
        var replaceButton = $('<button class="w3-button w3-card w3-hover-deep-orange w3-green" style="height:100%; margin-right:8px">Start</button>')
        replaceButton.on("click", () => { this.useStartSelection("replace") })
        this.buttonHolder.append(replaceButton)
    }else if(this.previousSelectedProject == selectedProjectID){
        var replaceButton = $('<button class="w3-button w3-card w3-deep-orange w3-hover-green" style="height:100%; margin-right:8px">Replace All Data</button>')
        var appendButton = $('<button class="w3-button w3-card w3-deep-orange w3-hover-green" style="height:100%">Append Data</button>')
    
        replaceButton.on("click", () => { this.useStartSelection("replace") })
        appendButton.on("click", () => { this.useStartSelection("append") })
        this.buttonHolder.append(appendButton,replaceButton)
    }else{
        var replaceButton = $('<button class="w3-button w3-card w3-deep-orange w3-hover-green" style="height:100%; margin-right:8px">Replace All Data</button>')
        replaceButton.on("click", () => { this.useStartSelection("replace") })
        this.buttonHolder.append(replaceButton)
    }
    globalCache.currentProjectID = selectedProjectID

    var projectOwner=projectInfo.owner
    try {
        var res = await msalHelper.callAPI("digitaltwin/fetchProjectModelsData", "POST", null, "withProjectID")
        globalCache.storeProjectModelsData(res.DBModels, res.adtModels)
        modelAnalyzer.clearAllModels();
        modelAnalyzer.addModels(res.adtModels)
        modelAnalyzer.analyze();
        var res = await msalHelper.callAPI("digitaltwin/fetchProjectTwinsAndVisualData", "POST", {"projectOwner":projectOwner}, "withProjectID")
        globalCache.storeProjectTwinsAndVisualData(res)
    } catch (e) {
        console.log(e)
        if (e.responseText) alert(e.responseText)
        return
    }
    if(this.chooseTwinBy=="tag") this.fillAvailableTags()
    else this.fillAvailableModels()
    this.listTwins()
}



startSelectionDialog.prototype.closeDialog=function(){
    this.DOM.hide()
    this.broadcastMessage({ "message": "startSelectionDialog_closed"})
}

startSelectionDialog.prototype.getTagsTwins = function(){
    var tagsTwins={"ALL":[],"Non Tagged":[]}
    for(var twinID in globalCache.DBTwins){
        var aDBTwin=globalCache.DBTwins[twinID]
        tagsTwins["ALL"].push(aDBTwin)
        var tag=aDBTwin.groupTag
        if(tag==null) tagsTwins["Non Tagged"].push(aDBTwin)
        else{
            if(tagsTwins[tag]==null)tagsTwins[tag]=[]
            tagsTwins[tag].push(aDBTwin)
        }
    }
    return tagsTwins
}

startSelectionDialog.prototype.fillAvailableTags = function(){
    var tagsTwins=this.getTagsTwins()
    this.modelsCheckBoxes.empty() 
    for(var tagName in tagsTwins){
        var arr=tagsTwins[tagName]
        var rowDiv=$("<div style='display:flex;align-items:center;margin-top:8px;height:24px'></div>")
        this.modelsCheckBoxes.append(rowDiv)
        rowDiv.append(`<input class="w3-check" style="top:0px;float:left" type="checkbox" id="${tagName}"/>`)
        rowDiv.append(`<label style="padding-left:5px">${tagName}</label><p/>`)
        var numberlabel=$("<label class='w3-lime' style='display:inline;font-size:9px;padding:2px;margin-left:5px;font-weight:normal;border-radius: 2px;'>"+arr.length+"</label>")
        rowDiv.append(numberlabel)
    }
    this.modelsCheckBoxes.off("change")//clear any previsou on change func
    this.modelsCheckBoxes.on("change",(evt)=>{
        this.listTwins()
    })
}

startSelectionDialog.prototype.fillAvailableModels = function() {
    this.modelsCheckBoxes.empty()
    this.modelsCheckBoxes.append('<div style="display:block"><input class="w3-check" type="checkbox" id="ALL"><label style="padding-left:5px"><b>ALL</b></label><p/></div>')
    globalCache.DBModelsArr.forEach(oneModel=>{
        var modelName=oneModel["displayName"]
        var modelID=oneModel["id"]
        var symbol=globalCache.generateModelIcon(modelID,40,"fixSize")
        var rowDiv=$("<div style='display:flex;align-items:center;margin-top:8px;height:40px'></div>")
        this.modelsCheckBoxes.append(rowDiv)
        rowDiv.append(`<div style="width:24px"><input class="w3-check" style="top:0px;float:left" type="checkbox" id="${modelID}"/></div>`)
        var innerDiv=$("<div style='display:flex;align-items:center;margin-left:6px'></div>")
        rowDiv.append(innerDiv)
        
        innerDiv.append(symbol)
        innerDiv.append(`<label style="padding-left:5px">${modelName}</label><p/>`)
    })
    this.modelsCheckBoxes.off("change") //clear any previsou on change func
    this.modelsCheckBoxes.on("change",(evt)=>{
        if($(evt.target).attr("id")=="ALL"){ 
            //select all the other input
            var val=$(evt.target).prop("checked")
            this.modelsCheckBoxes.find('input').each(function () {
                $(this).prop("checked",val)
            });
        }
        this.listTwins()
    })
}

startSelectionDialog.prototype.getSelectedTwins=function(){
    var reArr=[]
    var tagsTwins=this.getTagsTwins()
    if(this.chooseTwinBy=="tag"){
        var checkedArr=[]
        this.modelsCheckBoxes.find('input').each( function () {
            if(!$(this).prop("checked")) return;
            checkedArr=checkedArr.concat(tagsTwins[$(this).attr("id")])
        });
        var usedID={}
        checkedArr.forEach(oneTwin=>{
            if(usedID[oneTwin["id"]]) return;
            usedID[oneTwin["id"]]=1
            reArr.push(oneTwin)
        })
    }else{
        var chosenModels={}
        this.modelsCheckBoxes.find('input').each(function () {
            if(!$(this).prop("checked")) return;
            if($(this).attr("id")=="ALL") return;
            chosenModels[$(this).attr("id")]=1
        });
        for(var twinID in globalCache.DBTwins){
            var aTwin=globalCache.DBTwins[twinID]
            if(chosenModels[aTwin["modelID"]])  reArr.push(aTwin)
        }    
    }
    return reArr;
}

startSelectionDialog.prototype.listTwins=function(){
    this.selectedTwinsDOM.empty()
    var tr=$('<tr><td style="border-right:solid 1px lightgrey;border-bottom:solid 1px lightgrey;font-weight:bold">TWIN ID</td><td style="border-bottom:solid 1px lightgrey;font-weight:bold">MODEL ID</td></tr>')
    this.selectedTwinsDOM.append(tr)

    var selectedTwins=this.getSelectedTwins()
    selectedTwins.forEach(aTwin=>{
        var tr=$('<tr><td style="border-right:solid 1px lightgrey;border-bottom:solid 1px lightgrey">'+aTwin["displayName"]+'</td><td style="border-bottom:solid 1px lightgrey">'+aTwin['modelID']+'</td></tr>')
        this.selectedTwinsDOM.append(tr)
    })
    if(selectedTwins.length==0){
        var tr=$('<tr><td style="color:gray">zero record</td><td></td></tr>')
        this.selectedTwinsDOM.append(tr)    
    }
}


startSelectionDialog.prototype.useStartSelection=function(action){
    var bool_broadCastProjectChanged=false
    if(this.previousSelectedProject!=globalCache.currentProjectID){
        globalCache.initStoredInformtion()
        this.previousSelectedProject=globalCache.currentProjectID
        bool_broadCastProjectChanged=true
    }

    var selectedTwins=this.getSelectedTwins()
    var twinIDs=[]
    selectedTwins.forEach(aTwin=>{twinIDs.push(aTwin["id"])})

    var modelIDs=[]
    globalCache.DBModelsArr.forEach(oneModel=>{modelIDs.push(oneModel["id"])})

    this.broadcastMessage({ "message": "startSelection_"+action, "twinIDs": twinIDs,"modelIDs":modelIDs })
    var projectInfo=globalCache.findProjectInfo(globalCache.currentProjectID)
    if(projectInfo.defaultLayout && projectInfo.defaultLayout!="") globalCache.currentLayoutName=projectInfo.defaultLayout
    
    if(bool_broadCastProjectChanged){
        this.broadcastMessage({ "message": "projectIsChanged","projectID":globalCache.currentProjectID})
    }

    this.broadcastMessage({ "message": "layoutsUpdated","selectLayout":projectInfo.defaultLayout})
    this.closeDialog()

    if(globalCache.DBModelsArr.length==0){
        //directly popup to model management dialog allow user import or create model
        modelManagerDialog.popup()
        modelManagerDialog.DOM.hide()
        modelManagerDialog.DOM.fadeIn()
        //pop up welcome screen
        var popWin=$('<div class="w3-blue w3-card-4 w3-padding-large" style="position:absolute;top:50%;background-color:white;left:50%;transform: translateX(-50%) translateY(-50%);z-index:105;width:400px;cursor:default"></div>')
        popWin.html(`Welcome, ${msalHelper.userName}! Firstly, let's import or create a few twin models to start. <br/><br/>Click to continue...`)
        $("body").append(popWin)
        popWin.on("click",()=>{popWin.remove()})
        setTimeout(()=>{
            popWin.fadeOut("slow",()=>{popWin.remove()});
        },3000)
    }
}

module.exports = new startSelectionDialog();