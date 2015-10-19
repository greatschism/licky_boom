var ImageFactory = require('ti.imagefactory');

var currentPosition = {},
	currentAddress = {},
	foursquare = {};

var args = arguments[0],
	postCol = args.collection;

var onKeyboardHeightChange  = function(){
	$.controlWrap.bottom = AG.settings.get('keyboardframeHeight');
};
onKeyboardHeightChange();
AG.settings.on('change:keyboardframeHeight',onKeyboardHeightChange);

function send(e) {
	Ti.Analytics.featureEvent('camera.return');
	Ti.Media.cameraFlashMode = Ti.Media.CAMERA_FLASH_OFF;
	Ti.Media.takePicture();
}
// $.sendBtn.addEventListener('click', _.throttle(send,1000));
$.contentField.addEventListener('return', _.throttle(send,1000));
// $.contentField.addEventListener('return', function(){
	// $.shopNameField.focus();
// });

// guidance for facebook, twitter, etcs.. share 
var timeoutId, 
	guidanceBottom_down = $.guidanceLabel.getBottom(),
	guidanceBottom_up = guidanceBottom_down + $.guidanceLabel.getHeight() - $.guidanceLabel.getBorderRadius();
var showGuidance = function(message){
	if( timeoutId ){
		clearTimeout(timeoutId);
	}
	$.guidanceLabel.setText("   "+message+"   ");
	$.guidanceLabel.animate({
		duration: 60,
		bottom: guidanceBottom_up
	}, function(){
		timeoutId = setTimeout(function(){
			$.guidanceLabel.animate({
				duration: 60,
				bottom: guidanceBottom_down
			});
		}, 3000);
	});
};
var setFbShareBtn = function(){
	if( AG.settings.get('postWithFacebook') ){
		showGuidance( L('willBePostedToFacebook') );
		$.fbShareBtn.setBackgroundImage('images/fbShareActive.png');
	}else{
		showGuidance( L('willNotShareOnFacebook')	);
		$.fbShareBtn.setBackgroundImage('images/fbShareInactive.png');
	}
	
	$.requestLocationBtn.animate({
		duration: 50,
		right: -170
	});
};
$.fbShareBtn.addEventListener('click', function(){
	AG.settings.save('postWithFacebook', !AG.settings.get("postWithFacebook"), {
		success: function(){
			setFbShareBtn();
		}
	});
});

var setLocationBtn = function(opt){
	var guidanceVisible = opt && opt.guidanceVisible;
	switch ( Ti.Geolocation.getLocationServicesAuthorization() ) {
		case Ti.Geolocation.AUTHORIZATION_RESTRICTED:	// 시스템 알람에서 위치정보 허용 안한 경우
		case Ti.Geolocation.AUTHORIZATION_DENIED:	// 시스템 알람에서 위치정보 허용 안하거나 꺼져 있는 경우(테스트 상으로는 이것만 나옴)
			// alert('AUTHORIZATION_DENIED' );
			guidanceVisible && showGuidance( L('locationAuthDenied') );
			$.locationBtn.setBackgroundImage('images/locationUnkown.png');
			$.requestLocationBtn.animate({
				duration: 50,
				right: -170
			});
			return;
		case Ti.Geolocation.AUTHORIZATION_UNKNOWN:
			guidanceVisible && showGuidance( L('locationRequired') );
			$.locationBtn.setBackgroundImage('images/locationUnkown.png');
			// guidanceVisible && showGuidance( L('willPostedWithLocation') );
			// guidanceVisible && $.requestLocationBtn.setVisible(true);
			if( guidanceVisible ){
				setTimeout(function(){
					$.requestLocationBtn.animate({
						duration: 50,
						right: 19
					}, function(){
						return;
						setTimeout(function(){
							$.requestLocationBtn.animate({
								duration: 50,
								right: -170
							});
						}, 3000);
					});
				}, 0);
			}
			return;
		case Ti.Geolocation.AUTHORIZATION_AUTHORIZED:
		case Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE:
		case Ti.Geolocation.AUTHORIZATION_ALWAYS:
			// 위치 서비스를 처음 켰을때 버튼을 사라지게 해줘야..
			$.requestLocationBtn.animate({
				duration: 50,
				right: -170
			});
			break;
		default:
			break;
	}
	
	if( AG.settings.get('postWithLocation') ){
		guidanceVisible && showGuidance( L('willPostedWithLocation') );
		$.locationBtn.setBackgroundImage('images/locationActive.png');
	}else{
		guidanceVisible && showGuidance( L('willNotPostedWithLocation') );
		$.locationBtn.setBackgroundImage('images/locationInactive.png');
	}
};
$.locationBtn.addEventListener('click', function(){
	if(  Ti.Geolocation.getLocationServicesAuthorization() == Ti.Geolocation.AUTHORIZATION_UNKNOWN){
		setLocationBtn({guidanceVisible:true});
		getCurrentPosition();
	}else{
		AG.settings.save('postWithLocation', !AG.settings.get("postWithLocation"), {
			success: function(){
				setLocationBtn({guidanceVisible:true});
				getCurrentPosition();
			}
		});
	}
});


$.requestLocationBtn.addEventListener('click', function(e){
	AG.currentPosition.authorize(function(e){
		// setLocationBtn();
		getCurrentPosition();
	});
});
AG.currentPosition.on('changeGeoAuth', setLocationBtn);

/**
 *  shop name
 */
$.suggestCompletionListC.setProps({
	position: currentPosition,
	textField: $.shopNameField
});
$.shopNameField.addEventListener('change', function(e){
	foursquare.venue_id = "";
	foursquare.venue_name = e.value;

	setDistanceLabel();
});
$.shopNameField.addEventListener('suggestComplete', function(e){
	// alert(JSON.stringify(e.itemId));
	foursquare.venue_id = e.itemId;
	foursquare.venue_name = $.shopNameField.getValue();

	setDistanceLabel();
});
$.shopNameField.addEventListener('return', _.throttle(send,1000));



$.closeBtn.addEventListener('click', function(e) {
	Ti.Analytics.featureEvent('camera.close');
	if( $.shopNameField.hasText() ){
		// alert($.shopNameField.getValue()+"ddd");
	}
	if(OS_IOS){
		Ti.Media.hideCamera();
	}else{
		var activity = Ti.Android.currentActivity;
	}
	if(Ti.Media.availableCameras == 0){
		$.fakeCameraWin.close();
	}
	AG.settings.off('change:keyboardframeHeight',onKeyboardHeightChange);
});

$.contentField.addEventListener('change', function(e) {
	if(!this.value){
		$.contentLabel.applyProperties({
			text: L('postMessageHintText'),
			color : AG.COLORS.gray
		}); 
	}else{
		$.contentLabel.applyProperties({
			text: this.value,
			color : 'white'
		}); 
	}
});


// 현재 사용자 정보를 보여줌
$.hiddenProfile.image = AG.loggedInUser.getProfileImageUrl();
$.userName.text = AG.loggedInUser.get('first_name');





function getCurrentPosition(){
	// reverse geo
	// Titanium.Geolocation.getCurrentPosition(function(e){
	AG.currentPosition.update(function(e){
		var longitude = e.longitude;
		var latitude = e.latitude;
		if( !AG.currentPosition.get('success')  ){
			currentAddress = {};	// 현재 위치가 서버에 올라가지 않도록 빈 오브젝트로 대체 
			$.distance.setText( $.shopNameField.getValue() );
			return;
		}
		
		currentPosition.longitude = longitude;
		currentPosition.latitude = latitude;
		//alert(currentPosition);
		//mapView.setLocation(currentPosition);
		
		AG.utils.googleReverseGeo(_.extend({
			success: function(add){
				currentAddress.ko = add;
				setDistanceLabel();
			},
			error: function(){
				
			},
			locale : 'ko'
		},currentPosition));
		
		
		
		AG.utils.googleReverseGeo(_.extend({
			success: function(add){
				currentAddress.en = add;
				setDistanceLabel();
			},
			error: function(){
				
			},
			locale: 'en-US'
		},currentPosition));
	});	
}

function setDistanceLabel(){
	if( AG.settings.get('postWithLocation') && currentAddress[AG.currentLanguage]){
		$.distance.text =  ($.shopNameField.getValue()? $.shopNameField.getValue()+": ": "")
			 + AG.utils.getGoogleShortAddress(currentAddress[AG.currentLanguage].results[0]);
	}else{
		$.distance.text =  $.shopNameField.getValue();
	}
}

$.contentField.addEventListener('postlayout', function(e) {
	$.contentField.removeEventListener('postlayout',arguments.callee);
	$.contentField.focus();
	// toggleBtn(false);
	
	//fake cursor
	// $.fakeCursor.start();
	setFbShareBtn();
	setLocationBtn();
});


$.contentField.addEventListener('focus', function(){
	$.fieldWrap.setTouchEnabled(false);
	$.fakeCursor.setVisible(true);
	$.fakeCursor.start();
});
$.contentField.addEventListener('blur', function(){
	$.fieldWrap.setTouchEnabled(true);
	$.fakeCursor.stop();
	$.fakeCursor.setVisible(false);
});
$.fieldWrap.addEventListener('click', function(){
	$.contentField.focus();
});


exports.showCamera = function(){
	Ti.Analytics.featureEvent('camera.show');
	if(OS_IOS){
		Ti.Media.hideCamera();
	}
	var captureSize_2x = _.clone(AG.cameraInfo);
	_.each(captureSize_2x,function(value,key){
		captureSize_2x[key]=value*2;
	});
	
					  
	Ti.API.info(captureSize_2x);
	
	Ti.Media.showCamera({
		success : function(event) {
			if(OS_IOS){
				_.defer(function(){
					AG.settings.off('change:keyboardframeHeight',onKeyboardHeightChange);
					Ti.Media.hideCamera();
				});
			}
			
			Ti.API.info(event.media.width);
			Ti.API.info(event.media.height);
			Ti.API.info(event.media.mimeType);
			
			// 카메라에 찍힌 것을 비율 유지한체 높이를 640(captureSize_2x.width)에 맞도록 리사이징
			var height = parseInt(captureSize_2x.width*event.media.height/event.media.width);
			var resizedImage = ImageFactory.imageAsResized(event.media, {
					width : captureSize_2x.width,
					height : height
				});
				
			// 카메라 height 에 맞게 crop
			var croppedImage = ImageFactory.imageAsCropped(resizedImage,{
				x: 0,
				y: captureSize_2x.top, //상단 닫기가 있는 nav 영역
				width: captureSize_2x.width,
				height : captureSize_2x.height
			});

			//og:image 만들기위해 view를 변경하는 부분
			var fbImageSize_2x = { 
					width : captureSize_2x.width,
					height : 340
				}; // 1.91 : 1 을 유지하고 
				// https://developers.facebook.com/docs/opengraph/howtos/maximizing-distribution-media-content/
				
			// if(AG.settings.get('postWithFacebook')){
				
				// 캡쳐하기 위해서 불필요한 부분 감추고 필요한 부분 보인다.
				// $.fieldWrap.width = AG.cameraInfo.width;
				// $.fieldWrap.height = AG.cameraInfo.height;
				$.profileImage.visible = false;
				$.userName.visible = false;
				$.distance.visible = false;
				$.fieldOpacityBG.visible = false;
				$.fieldWrap.backgroundImage = croppedImage;

				// $.fieldOpacityBG2.visible = true;
				$.fakeCursor.visible = false;
				//가짜 textfiled가 typing ux를 위해 left 정렬했기에 ...이 나오면 왼쪽에 쏠리게 되는데 캡쳐할 때는 오른쪽에 붙도록
				// $.contentLabel.textAlign = 'right';  
				$.contentLabel.visible = false;  
				
				$.captureTitle.text = $.contentField.value;
				$.captureDistance.text = $.distance.text;
				$.captureContentImage.width = AG.cameraInfo.width;
				$.captureContentImage.height = AG.cameraInfo.height;
				$.captureContentImage.image = $.fieldWrap.toImage(null, true);
 
			// }
			
			var blob = ImageFactory.compress(croppedImage, 0.75);
			
			//TODO : bug에 따른 임시 지정 
			postCol.recentBlob = blob;
			///
			var postContent = {
				title : $.contentField.value,
				content : '_#Are you hacker?? Free beer lover? Please contact us! (sup@licky.co) :)#_',
				photo : blob,
				//user_id: AG.loggedInUser.get('id'),
				"photo_sizes[medium_320]" : AG.cameraInfo.width + 'x' + AG.cameraInfo.height,
				"photo_sizes[thumb_100]" : "100x100#",
				'photo_sync_sizes[]' :'original',
				custom_fields : {
					foursquare_venue_id: foursquare.venue_id,
					// foursquare_venue_name: foursquare.venue_name,
					venue_name: foursquare.venue_name,
					
					// coordinates: [currentPosition.longitude, currentPosition.latitude ],
					// address_ko: currentAddress.ko.results[0],
					// address_en: currentAddress.en.results[0]
				}
			};
			
			
			if( AG.settings.get("postWithLocation") &&  
				( 
					Ti.Geolocation.getLocationServicesAuthorization() == Ti.Geolocation.AUTHORIZATION_AUTHORIZED
					|| Ti.Geolocation.getLocationServicesAuthorization() == Ti.Geolocation.AUTHORIZATION_ALWAYS
					|| Ti.Geolocation.getLocationServicesAuthorization() == Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE
				)
			){
				postContent.custom_fields.coordinates = [currentPosition.longitude, currentPosition.latitude ];
				postContent.custom_fields.address_ko = currentAddress.ko.results[0];
				postContent.custom_fields.address_en = currentAddress.en.results[0];
			}
			
			var fbOgImageBlog = ImageFactory.compress(ImageFactory.imageAsResized($.fbOgImageRenderView.toImage(null,true),{
				width : fbImageSize_2x.width,
				height :fbImageSize_2x.height,
				hires : false
			}), 0.2);
			postCol.create(postContent,{
				wait:true,
				success : function(nextPost){
					Ti.API.info(nextPost.attributes);
					Ti.Analytics.featureEvent('camera.created.post');
					
					// if(AG.settings.get('postWithFacebook')){
						var sharePhoto = Alloy.createModel('photo');
						sharePhoto.save({
							"collection_name" : "facebook_preview",
							"photo_sizes[medium_320]" : AG.cameraInfo.width + 'x' + AG.cameraInfo.height,
							'photo_sync_sizes[]' :'original',
		    				photo: fbOgImageBlog,
		    				custom_fields : {
								"[ACS_Post]parent_id": nextPost.id
							}
						},
						{
							success : function(nextPreviewPhoto){
								Ti.Analytics.featureEvent('camera.created.ogimage');
								AG.allowPushController.tryRegisterPush({
									title: L('successPhotoUpload')
								});
								
								//alert(nextPreviewPhoto.get('urls').original);
								if(AG.settings.get('postWithFacebook')){
									Ti.Analytics.featureEvent('camera.enabled.facebookshare');
									var goFacebook = function(){
										AG.facebook.requestWithGraphPath('me/links', {
											// message : "",
											link : 'http://www.licky.co/post/'+nextPost.id
											// link: 'http://dasolute.com/asdf3.html'
										}, "POST", function(e) {
											if (e.success) {
												Ti.Analytics.featureEvent('camera.created.facebookshare');
												//alert("Success!  From FB: " + e.result);
											} else {
												if (e.error) {
													//alert(e.error);
												} else {
													//alert("Unkown result");
												}
											}
										});
									};
									
									var cnt = 0;
									var checkAgain = function(){
										AG.Cloud.Photos.show({
											 photo_id: nextPreviewPhoto.id
										}, function (e) {
										    if (e.success) {
										        var photo = e.photos[0];
										        if(photo.processed){
										        	goFacebook();
										        	return;
										        }
										    }
										    
										    if(cnt++<10){
										    	setTimeout(checkAgain,5000);
										    }
										});
									};
									checkAgain();
								}

							}
						});
					// }
				}
			});
			
			
			
		},
		cancel : function() {
		},
		error : function(error) {
			if(ENV_DEV || EVN_TEST){
				var win = Ti.UI.createWindow({
					backgroundColor:'white',
					fullscreen : true
				});
				win.add($.getView());
				
				
				win.open({
					modal:true
				});
				$.fakeCameraWin = win;
			}else{
				var message;
				if (error.code == Ti.Media.NO_CAMERA) {
					message = 'Device does not have camera';
				} else {
					message = 'Unexpected error: ' + error.code;
				}
		
				Ti.UI.createAlertDialog({
					title : 'Camera',
					message : message
				}).show();
			}
		},
		overlay : $.getView(),
		saveToPhotoGallery : false,
		allowEditing : false,
		showControls : false,
		animated : true,
		autohide : false,
		transform : Ti.UI.create2DMatrix().scale(1),
		mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO]
	});
	getCurrentPosition();
};

function hiddenProfileOnLoad(){
	// _.find(this.parent.children,function(proxy){
		// return proxy.bindId === 'profileImage';
	// }).image = this.image;
	$.profileImage.image = this.image;
	//TODO : proxy찾는 하드코딩된 부분을 제거
}
