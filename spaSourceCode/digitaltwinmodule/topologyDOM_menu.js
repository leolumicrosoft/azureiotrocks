const globalCache = require("../sharedSourceFiles/globalCache")
const newTwinDialog=require("../sharedSourceFiles/newTwinDialog");
const simpleConfirmDialog=require("../sharedSourceFiles/simpleConfirmDialog")
const simpleSelectMenu=require("../sharedSourceFiles/simpleSelectMenu")
const msalHelper=require("../msalHelper")

function topologyDOM_menu(parentTopologyDOM){
    this.parentTopologyDOM=parentTopologyDOM
    this.core=parentTopologyDOM.core
    this.contenxtMenuInstance = this.core.contextMenus('get')
    this.addMenuItemsForEditing()
    this.addMenuItemsForOthers()
    this.addMenuItemsForLiveData()
}

topologyDOM_menu.prototype.decideVisibleContextMenu=function(clickEle){
    //hide all menu items
    var allItems=['ConnectTo','ConnectFrom','QueryOutbound','QueryInbound','SelectOutbound','SelectInbound','enableLiveDataStream','COSE','addSimulatingDataSource','liveData','Hide','Others','Simulation', 'startSimulatingDataSource', 'stopSimulatingDataSource', 'editing','DeleteAll']
    allItems.forEach(ele=>{this.contenxtMenuInstance.hideMenuItem(ele)})
    
    var selectedNodes=this.core.$('node:selected')
    var selected=this.core.$(':selected')
    var isClickingNode=(clickEle.isNode && clickEle.isNode() )
    var hasNode=isClickingNode || (selectedNodes.length>0)
    if(clickEle.isNode && clickEle.data("originalInfo") && clickEle.data("originalInfo").simNodeName) var clickSimNode=true
    
    var showMenuArr=(arr)=>{
        arr.forEach(ele=>{this.contenxtMenuInstance.showMenuItem(ele)})
    }

    if(clickSimNode) {
        var simNodeName=clickEle.data('originalInfo').simNodeName
        showMenuArr(['editing','DeleteAll','Simulation'])
        if(this.parentTopologyDOM.simDataSourceManager.runningSimDataSource[simNodeName]){
            showMenuArr(['stopSimulatingDataSource'])
        }else showMenuArr(['startSimulatingDataSource'])
    }else{
        if(hasNode){
            showMenuArr(['editing','ConnectTo','ConnectFrom','Others','QueryOutbound','QueryInbound','SelectOutbound','SelectInbound','Hide','DeleteAll'])
            if(isClickingNode) showMenuArr(['liveData','enableLiveDataStream','addSimulatingDataSource'])
            if(selected.length>1) showMenuArr(['COSE'])
        }
        if(!hasNode && !clickEle.data().notTwin) showMenuArr(['editing','DeleteAll'])
    }
}

topologyDOM_menu.prototype.addMenuItemsForLiveData = function () {
    this.contenxtMenuInstance.appendMenuItems([
        {
            id: 'liveData',
            content: 'Live Data',
            selector: 'node',
            disabled:true,
            onClickFunction: ()=>{}//empty func, it is only a menu title item
        },
        {
            id: 'Simulation',
            content: 'Simulation',
            selector: 'node[modelID = "_fixed_simulationDataSource"]',
            disabled:true,
            onClickFunction: ()=>{}//empty func, it is only a menu title item
        },
        {
            id: 'startSimulatingDataSource',
            content: 'Start',
            selector: 'node[modelID = "_fixed_simulationDataSource"]',
            onClickFunction: (e) => {
                this.selectClickedEle(e.target)
                var target = e.target || e.cyTarget;
                this.parentTopologyDOM.simDataSourceManager.startSimNode(e.target)
            }
        },
        {
            id: 'stopSimulatingDataSource',
            content: 'Stop',
            selector: 'node[modelID = "_fixed_simulationDataSource"]',
            onClickFunction: (e) => {
                this.selectClickedEle(e.target)
                var target = e.target || e.cyTarget;
                this.parentTopologyDOM.simDataSourceManager.stopSimNode(e.target)
            }
        },
        {
            id: 'addSimulatingDataSource',
            content: 'Add Simulator Source',
            selector: 'node',
            onClickFunction: (e) => {
                this.selectClickedEle(e.target)
                var target = e.target || e.cyTarget;
                this.parentTopologyDOM.addSimulatorSource(target.id())
            }
        },
        {
            id: 'enableLiveDataStream',
            content: 'Monitor Live Data',
            selector: 'node', 
            onClickFunction: (e) => {
                this.selectClickedEle(e.target)
                var target = e.target || e.cyTarget;
                this.parentTopologyDOM.enableLiveDataStream(target.id())
            }
        }
    ])
}

topologyDOM_menu.prototype.addMenuItemsForEditing = function () {
    this.contenxtMenuInstance.appendMenuItems([
        {
            id: 'editing',
            content: 'Edit',
            selector: 'node,edge',
            disabled:true,
            onClickFunction: ()=>{}//empty func, it is only a menu title item
        },
        {
            id: 'ConnectTo',
            content: 'Connect To',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.startTargetNodeMode("connectTo",this.node_changeSelectionWhenClickElement(e.target))
            }
        },
        {
            id: 'ConnectFrom',
            content: 'Connect From',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.startTargetNodeMode("connectFrom",this.node_changeSelectionWhenClickElement(e.target))
            }
        },
        {
            id: 'DeleteAll',
            content: 'Delete',
            selector: 'node,edge',
            onClickFunction: (e) => {
                var collection=this.nodeoredge_changeSelectionWhenClickElement(e.target)
                collection.unselect()
                this.parentTopologyDOM.selectFunction()
                if(collection.length==1){
                    var ele=collection[0]
                    if(ele.data && ele.data("originalInfo").simNodeName){
                        this.parentTopologyDOM.deleteSimNode(ele)
                        return
                    }
                }
                this.parentTopologyDOM.deleteElementsArray(collection)
            }
        }
    ])
}

topologyDOM_menu.prototype.addMenuItemsForOthers = function () {
    this.contenxtMenuInstance.appendMenuItems([
        {
            id: 'Others',
            content: 'Others', 
            selector: 'node,edge',
            disabled:true,
            onClickFunction: ()=>{} //empty func, it is only a menu title item
        },
        {
            id: 'QueryOutbound',
            content: 'Load Outbound',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.loadOutBound(this.node_changeSelectionWhenClickElement(e.target))
            }
        },
        {
            id: 'QueryInbound',
            content: 'Load Inbound', 
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.loadInBound(this.node_changeSelectionWhenClickElement(e.target))
            }
        },{
            id: 'SelectOutbound',
            content: '+Select Outbound',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.selectOutboundNodes(this.node_changeSelectionWhenClickElement(e.target))
            }
        },
        {
            id: 'SelectInbound',
            content: '+Select Inbound',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.selectInboundNodes(this.node_changeSelectionWhenClickElement(e.target))
            }
        },
        {
            id: 'COSE',
            content: 'COSE Layout',
            selector: 'node,edge',
            onClickFunction: (e) => {
                this.parentTopologyDOM.coseSelected()
            }
        },
        {
            id: 'duplicate',
            content: 'Duplicate',
            selector: 'node',
            onClickFunction: (e) => {
                var collection=this.selectClickedEle(e.target)
                var oInfo=JSON.parse(JSON.stringify(e.target.data("originalInfo")))
                delete oInfo["$metadata"];delete oInfo["$dtId"];delete oInfo["$etag"];delete oInfo["displayName"]
                oInfo["$metadata"]={"$model": e.target.data("modelID")}
                newTwinDialog.popup(oInfo,(twinInfo)=>{
                    var twinName=twinInfo.displayName
                    //copy this node's scale and rotate to the new node
                    this.parentTopologyDOM.visualManager.applyNodeScaleRotate(twinName,e.target.data("scaleFactor"),e.target.data("rotateAngle"))
                })
            }
        },
        {
            id: 'Hide',
            content: 'Hide',
            selector: 'node,edge',
            onClickFunction: (e) => {
                var collection=this.node_changeSelectionWhenClickElement(e.target)
                this.parentTopologyDOM.hideCollection(collection)
            }
        },
        {
            id: 'addGroupTag',
            content: 'Add Group Tag',
            selector: 'node',
            onClickFunction: (e) => {
                var collection=this.node_changeSelectionWhenClickElement(e.target).filter('node')
                var nodesID=[]
                collection.forEach(ele=>{
                    nodesID.push(ele.data("originalInfo")["$dtId"])
                })
                this.setGroupTag(nodesID)
            }
        },
        {
            id: 'copyScaleRotate',
            content: 'Copy Style',
            selector: 'node.edgebendediting_scaleRotate',
            onClickFunction: (e) => {
                var collection=this.node_changeSelectionWhenClickElement(e.target)
                var n=collection[0]
                globalCache.clipboardNodeStyle={"scaleFactor":n.data("scaleFactor")||1,"rotateAngle":n.data("rotateAngle")||0}
            }
        },
        {
            id: 'pasteScaleRotate',
            content: 'Paste Style',
            selector: 'node',
            onClickFunction: (e) => {
                var collection=this.node_changeSelectionWhenClickElement(e.target)
                var n=collection[0]
                if(globalCache.clipboardNodeStyle){
                    //'useScaleRotate' is defined in customized cytoscape edge editing addon module. I use it here so this action is undoable
                    var oldScaleRotate={scale:n.data("scaleFactor")||1,rotate:n.data("rotateAngle")||0}
                    this.core.undoRedo().do('useScaleRotate', {"node":n,"newScaleRotate":{"scale":globalCache.clipboardNodeStyle.scaleFactor,"rotate":globalCache.clipboardNodeStyle.rotateAngle},"oldScaleRotate":oldScaleRotate} );
                }
                
            }
        }
    ])
}

topologyDOM_menu.prototype.getAllTags = function(){
    var tags={}
    for(var twinID in globalCache.DBTwins){
        var aDBTwin=globalCache.DBTwins[twinID]
        var tag=aDBTwin.groupTag
        if(tag!=null) tags[tag]=1
    }
    return tags
}

topologyDOM_menu.prototype.setGroupTag=function(nodesIDArr){
    var dialog=new simpleConfirmDialog()
    var sendTagReqest=(tagStr)=>{
        msalHelper.callAPI("digitaltwin/setTwinsGroupTag", "POST", {"twinsIDArr":nodesIDArr,"groupTag":tagStr},"withProjectID")
        dialog.close() 
    }
    dialog.show({"width":"320px"},{
        "title":"Assign Group Tag",
        "customDrawing":(parentDOM)=>{
            var currentTags=new simpleSelectMenu("Use a existing group tag or fill a new one below")
            parentDOM.append(currentTags.DOM)
            var tags=this.getAllTags()
            for(var atag in tags) currentTags.addOption(atag)
            dialog.tagInput=$('<input type="text" style="margin:8px 0;padding:2px;width:290px;outline:none;display:inline" placeholder="Tag"/>').addClass("w3-input w3-border");
            parentDOM.append(dialog.tagInput)
            dialog.tagInput.on('keyup', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    sendTagReqest(dialog.tagInput.val())
                }
            });
            currentTags.callBack_clickOption=(optionText,optionValue)=>{
                dialog.tagInput.val(optionText)
            }
        },
        "buttons":[
            {
                "text": "OK",
                "colorClass":"w3-lime",
                "clickFunc": () => {
                    sendTagReqest(dialog.tagInput.val())
                }
            },
            {"text":"Cancel","colorClass":"w3-light-gray","clickFunc":()=>{dialog.close()}}
        ]
    })
}

topologyDOM_menu.prototype.selectElement=function(element){
    element.select()
    this.parentTopologyDOM.selectFunction()
}

topologyDOM_menu.prototype.selectIfClickEleIsNotSelected=function(clickEle){
    if(!clickEle.selected()){
        this.core.$(':selected').unselect()
        this.selectElement(clickEle)
    }
}

topologyDOM_menu.prototype.selectClickedEle=function(clickEle){
    this.core.$(':selected').unselect()
    this.selectElement(clickEle)
}

topologyDOM_menu.prototype.node_changeSelectionWhenClickElement=function(clickEle){
    if(clickEle.isNode && clickEle.isNode()){
        this.selectIfClickEleIsNotSelected(clickEle)
    }
    var arr=this.core.$(':selected')
    return arr
}
topologyDOM_menu.prototype.nodeoredge_changeSelectionWhenClickElement=function(clickEle){
    if(clickEle.isNode){ //at least having isnode function means it is node or edge
        this.selectIfClickEleIsNotSelected(clickEle)
    }
    var arr=this.core.$(':selected')
    return arr
}



module.exports = topologyDOM_menu;