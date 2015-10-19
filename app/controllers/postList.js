
/**
 * Models
 */

$.fetchWhereData = {
	user_id: {'$ne' : "5322b0eb5204c6106802ea57"}
}; // 상속할때 where에 추가하고 싶으면 여기에 지정

var postCol = Alloy.createCollection('post');
var friendPostCol = Alloy.createCollection('post');

postCol.on('remove',function(model){
	// TODO : 1. 사진 지우고 2. facebook용 이미지 지우고
	
});

$.listViewC.setCollection(postCol);


$.listViewC.setTemplateControls([
	'postItemTemplate'
]);


$.listViewC.on('itemclick', require('underscore1.7.0').throttle(function(e) {
	if (e.model) {
		if (e.bindId == "profileImage") {
			AG.utils.openController(AG.mainTabGroup.activeTab, 'profile', {
				//user가 backbone 모델 형태가 아니므로 model로 만들어서 넘겨준다.
				userModel : Alloy.createModel('user',e.model.get('user'))
			});
		} else {
			AG.utils.openController(AG.mainTabGroup.activeTab, 'postDetail', {
				postModel : e.model //clicked Model
			});
		}
	}
},1000,{trailing: false})); 


AG.loginController.on('login',function () {
	$.listViewC.listView.scrollToItem(1,0);
	searchFacebookFriends();
	postCol.reset(postCol.models); //새로 fetch하지 않음. 삭제 가능여부를 새로 판단해야하기에 때문에 다시 reset함.
});

AG.loginController.on('logout',function () {
	$.listViewC.listView.scrollToItem(1,0);
	if($.tBar.index==1){
		$.tBar.setIndex(0);
		$.tBar.fireEvent('click',{index:0});
		$.listViewC.setCollection(postCol);
	}
	postCol.reset(postCol.models); //새로 fetch하지 않음. 삭제 가능여부를 새로 판단해야하기에 때문에 다시 reset함.
});

//init UI

//최초 실행시 tabbedBar가 안보이도록 함
$.getView().addEventListener('focus', function(e) {
	this.removeEventListener('focus',arguments.callee);
	$.onFirstFocus();
});

$.listViewC.listView.visible=false;
$.onFirstFocus = function(e){
	$.listViewC.listView.contentTopOffset = -19;
	$.listViewC.listView.visible=true;
	$.fetchFirstCollection();
};

$.fetchFirstCollection = function(){
	postCol.defaultFetchData = {
		order : "-created_at",
		where : $.fetchWhereData,
		show_user_like : true,
		limit : 30
	};
	postCol.fetch(); //최초 fetch
};


function searchFacebookFriends(){
	if(AG.isLogIn()){
		var friendIds = [];
		AG.Cloud.SocialIntegrations.searchFacebookFriends(
			{
				per_page : 1000,
				limit : 1000
			},
			function (e){
			    if (e.success) {
			        // alert('Success:\n' + 'Count: ' + e.users.length);
			        _.each(e.users,function(user){
			        	friendIds.push(user.id);
			        });
			        fetchOnlyFriendsPost(friendIds);
			    } else {
			        if(e.code===400 && e.message && e.message.indexOf('OAuthException')>=0){
			        	AG.Cloud.SocialIntegrations.externalAccountLogin({
			        		external_accounts : {
			        			token: AG.facebook.getAccessToken()	
			        		}
						}, function (e) {
						    if (e.success) {
						        searchFacebookFriends();
						    } else {
						    	alert(L('failToTokenRenewalLogin'));
					        	$.tBar.setIndex(0);
						    }
						});
			        }// alert('Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
			    }
			}
		);
	}else{
		showOnlyLoginRequiredMessage();
	}
}

function fetchOnlyFriendsPost(userIds) {
	if(userIds && userIds.length){
		userIds.push(AG.loggedInUser.get('id'));
		friendPostCol.defaultFetchData = {
			where : _.extend(_.clone($.fetchWhereData),{
				user_id: {'$in' : userIds}
			}),
			limit : 30
			//order : "-created_at"
		};
		Ti.API.info(friendPostCol.defaultFetchData);
		friendPostCol.fetch({
			error:function(){
				alert(L('defaultError'));
			}
		});
	}else{
		//TODO: 추천 방법과 관련되서는 더 고민 필요
		if($.tBar.index==1){ //친구것만 일때
			$.listViewC.listView.footerView = Ti.UI.createLabel({
				text : L('noFBFriends'),
				font : {
					fontFamily : 'AppleSDGothicNeo-Light'
				},
				left : 10,
				right : 10
			});
		}
	}
}

/**
 * UI
 */

$.listHeaderView.parent.remove($.listHeaderView);
$.listViewC.topSection.headerView = $.listHeaderView;

$.tBar.addEventListener('click', function(e) {
	Ti.Analytics.featureEvent('list.filtertab.click');
	switch(e.index){
		case 0:
			$.listViewC.setCollection(postCol);
			postCol.trigger('reset',postCol);
		break;
		case 1:
			AG.loginController.requireLogin({
				success : function(){
					$.listViewC.setCollection(friendPostCol);
					searchFacebookFriends();
				},
				cancel : function(){
					$.tBar.setIndex(0);
				},
				message : L('friendsPostNeedsLogin')
			});
			
		break;
	}
});



/**
 * 
 */
function showCamera(){
	AG.loginController.requireLogin({
		success : function(){
			Alloy.createController('cameraOveray',{
				collection : postCol
			}).showCamera();
		},
		message : L('cameraNeedsLogin')
	});
}
