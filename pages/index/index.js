//index.js
//获取应用实例
var app = getApp()
Page({
  data: {
    indicatorDots: true,
    autoplay: true,
    interval: 3000,
    duration: 1000,
    loadingHidden: false , // loading
    userInfo: {},
    swiperCurrent: 0,  
    selectCurrent:0,
    categories: [],
    activeCategoryId: 0,
    goods:[],
    scrollTop:0,
    loadingMoreHidden:true,

    hasNoCoupons:true,
    coupons: [],
    searchInput: '',

    curPage:1,
    pageSize:20,
    wifiData:{
      startError: '',//初始化错误提示
      wifiListError: false, //wifi列表错误显示开关
      wifiListErrorInfo: '',//wifi列表错误详细
      system: '', //版本号
      platform: '', //系统 android
      ssid: '迪信通',//wifi帐号(必填)
      pass: '12345678',//无线网密码(必填)
      bssid: '',//设备号 自动获取
      endError: ''//连接最后的提示
    }
  },

  tabClick: function (e) {
    this.setData({
      activeCategoryId: e.currentTarget.id,
      curPage: 1
    });
    this.getGoodsList(this.data.activeCategoryId);
  },
  //事件处理函数
  swiperchange: function(e) {
      //console.log(e.detail.current)
       this.setData({  
        swiperCurrent: e.detail.current  
    })  
  },
  toDetailsTap:function(e){
    wx.navigateTo({
      url:"/pages/goods-details/index?id="+e.currentTarget.dataset.id
    })
  },
  tapBanner: function(e) {
    if (e.currentTarget.dataset.id != 0) {
      wx.navigateTo({
        url: "/pages/goods-details/index?id=" + e.currentTarget.dataset.id
      })
    }
  },
  bindTypeTap: function(e) {
     this.setData({  
        selectCurrent: e.index  
    })  
  },
  onLoad: function () {
    var that = this

    //检测手机型号
    wx.getSystemInfo({
      success: function (res) {
        var system = '';
        if (res.platform == 'android') system = parseInt(res.system.substr(8));
        if (res.platform == 'ios') system = parseInt(res.system.substr(4));
        if (res.platform == 'android' && system < 6) {
          // that.setData({ 'wifiData.startError': '手机版本暂时不支持' }); return
          wx.showToast({
            title: '手机版本暂时不支持',
            icon: 'none',
            duration: 2000
          })
          return
        }
        if (res.platform == 'ios' && system < 11) {
          //that.setData({ 'wifiData.startError': '手机版本暂时不支持' }); return
          wx.showToast({
            title: '手机版本暂时不支持',
            icon: 'none',
            duration: 2000
          })
          return
        }
        that.setData({ 'wifiData.platform': res.platform });
        //初始化 Wi-Fi 模块
        that.startWifi(that);
      }
    })

    wx.setNavigationBarTitle({
      title: wx.getStorageSync('mallName')
    })
    wx.request({
      url: 'https://api.it120.cc/' + app.globalData.subDomain + '/banner/list',
      data: {
        key: 'mallName'
      },
      success: function(res) {
        if (res.data.code == 404) {
          wx.showModal({
            title: '提示',
            content: '请在后台添加 banner 轮播图片',
            showCancel: false
          })
        } else {
          that.setData({
            banners: res.data.data
          });
        }
      }
    }),
    wx.request({
      url: 'https://api.it120.cc/'+ app.globalData.subDomain +'/shop/goods/category/all',
      success: function(res) {
        var categories = [{id:0, name:"全部"}];
        if (res.data.code == 0) {
          for (var i = 0; i < res.data.data.length; i++) {
            categories.push(res.data.data[i]);
          }
        }
        that.setData({
          categories:categories,
          activeCategoryId:0,
          curPage: 1
        });
        that.getGoodsList(0);
      }
    })
    that.getCoupons ();
    that.getNotice ();
  },

  // wifi 模块
  startWifi: function (that) {
    wx.startWifi({
      success: function () {
        wx.getConnectedWifi({
          success:function(res){
            // console.log("已经连接上了",res)
            if (res.wifi.SSID != that.data.wifiData.ssid) {
              that.getList(that);
            }
          },
          fail:function(res){
            // console.log("没连上",res)
            that.getList(that);
          }
        })

        // that.getList(that);
      },
      fail: function (res) {
        //that.setData({ 'wifiData.startError': res.errMsg });
        wx.showToast({
          title: res.errMsg,
          icon: 'none',
          duration: 2000
        })
      }
    })
  },
  getList: function (that) {
    //安卓执行方法
    if (that.data.wifiData.platform == 'android' || that.data.wifiData.platform == 'ios') {
      //请求获取 Wi-Fi 列表
      wx.getWifiList({
        success: function (res) {
          //安卓执行方法
          that.AndroidList(that);
        },
        fail: function (res) {
          // that.setData({ 'wifiData.wifiListError': true });
          // that.setData({ 'wifiData.wifiListErrorInfo': res.errMsg });
          wx.showToast({
            title: res.errMsg,
            icon: 'none',
            duration: 2000
          })
        }
      })
    }
    //IOS执行方法
    if (that.data.wifiData.platform == 'ios') {
      that.IosList(that);
    }

  },
  AndroidList: function (that) {
    //监听获取到 Wi-Fi 列表数据
    wx.onGetWifiList(function (res) { //获取列表
      if (res.wifiList.length) {
        // that.setData({
        //   wifiList: res.wifiList
        // });
        //循环找出信号最好的那一个
        var ssid = that.data.wifiData.ssid;
        var signalStrength = 0;
        var bssid = '';
        for (var i = 0; i < res.wifiList.length; i++) {
          if (res.wifiList[i]['SSID'] == ssid && res.wifiList[i]['signalStrength'] > signalStrength) {
            bssid = res.wifiList[i]['BSSID'];
            signalStrength = res.wifiList[i]['signalStrength'];
          }
        }
        if (!signalStrength) {
          // that.setData({ 'wifiData.wifiListError': true });
          // that.setData({ 'wifiData.wifiListErrorInfo': '未查询到设置的wifi' });
          wx.showToast({
            title: "未查询到设置的wifi",
            icon: 'none',
            duration: 2000
          })
          return
        }
        that.setData({ 'wifiData.bssid': bssid });
        //执行连接方法
        //连接wifi
        that.Connected(that);
      } else {
        // that.setData({ 'wifiData.wifiListError': true });
        // that.setData({ 'wifiData.wifiListErrorInfo': '未查询到设置的wifi' });
        wx.showToast({
          title: "未查询到设置的wifi",
          icon: 'none',
          duration: 2000
        })
      }
    })
  },
  IosList: function (that) {
    // that.setData({ 'wifiData.wifiListError': true });
    // that.setData({ 'wifiData.wifiListErrorInfo': 'IOS暂不支持' });
    wx.showToast({
      title: "未查询到设置的wifi",
      icon: 'none',
      duration: 2000
    })
  },//连接wifi
  Connected: function (that) {
    wx.connectWifi({
      SSID: that.data.wifiData.ssid,
      BSSID: that.data.wifiData.bssid,
      password: that.data.wifiData.pass,
      success: function (res) {
        // that.setData({ 'wifiData.endError': 'wifi连接成功' });
        wx.showToast({
          title: "wifi连接成功",
          icon: 'success',
          duration: 2000
        })
      },
      fail: function (res) {
        // that.setData({ 'wifiData.endError': res.errMsg });
        wx.showToast({
          title: res.errMsg,
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

 //业务逻辑部分
  onPageScroll(e) {
    let scrollTop = this.data.scrollTop
    this.setData({
      scrollTop: e.scrollTop
    })
   },
  getGoodsList: function (categoryId, append) {
    if (categoryId == 0) {
      categoryId = "";
    }
    var that = this;
    wx.showLoading({
      "mask":true
    })
    wx.request({
      url: 'https://api.it120.cc/'+ app.globalData.subDomain +'/shop/goods/list',
      data: {
        categoryId: categoryId,
        nameLike: that.data.searchInput,
        page: this.data.curPage,
        pageSize: this.data.pageSize
      },
      success: function(res) {
        wx.hideLoading()        
        if (res.data.code == 404 || res.data.code == 700){
          let newData = { loadingMoreHidden: false }
          if (!append) {
            newData.goods = []
          }
          that.setData(newData);
          return
        }
        let goods = [];
        if (append) {
          goods = that.data.goods
        }        
        for(var i=0;i<res.data.data.length;i++){
          goods.push(res.data.data[i]);
        }
        that.setData({
          loadingMoreHidden: true,
          goods:goods,
        });
      }
    })
  },
  getCoupons: function () {
    var that = this;
    wx.request({
      url: 'https://api.it120.cc/' + app.globalData.subDomain + '/discounts/coupons',
      data: {
        type: ''
      },
      success: function (res) {
        if (res.data.code == 0) {
          that.setData({
            hasNoCoupons: false,
            coupons: res.data.data
          });
        }
      }
    })
  },
  gitCoupon : function (e) {
    var that = this;
    wx.request({
      url: 'https://api.it120.cc/' + app.globalData.subDomain + '/discounts/fetch',
      data: {
        id: e.currentTarget.dataset.id,
        token: wx.getStorageSync('token')
      },
      success: function (res) {
        if (res.data.code == 20001 || res.data.code == 20002) {
          wx.showModal({
            title: '错误',
            content: '来晚了',
            showCancel: false
          })
          return;
        }
        if (res.data.code == 20003) {
          wx.showModal({
            title: '错误',
            content: '你领过了，别贪心哦~',
            showCancel: false
          })
          return;
        }
        if (res.data.code == 30001) {
          wx.showModal({
            title: '错误',
            content: '您的积分不足',
            showCancel: false
          })
          return;
        }
        if (res.data.code == 20004) {
          wx.showModal({
            title: '错误',
            content: '已过期~',
            showCancel: false
          })
          return;
        }
        if (res.data.code == 0) {
          wx.showToast({
            title: '领取成功，赶紧去下单吧~',
            icon: 'success',
            duration: 2000
          })
        } else {
          wx.showModal({
            title: '错误',
            content: res.data.msg,
            showCancel: false
          })
        }
      }
    })
  },
  onShareAppMessage: function () {
    return {
      title: wx.getStorageSync('mallName') + '——' + app.globalData.shareProfile,
      path: '/pages/index/index',
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
  },
  getNotice: function () {
    var that = this;
    wx.request({
      url: 'https://api.it120.cc/' + app.globalData.subDomain + '/notice/list',
      data: { pageSize :5},
      success: function (res) {
        if (res.data.code == 0) {
          that.setData({
            noticeList: res.data.data
          });
        }
      }
    })
  },
  listenerSearchInput: function (e) {
    this.setData({
      searchInput: e.detail.value
    })

  },
  toSearch : function (){
    this.setData({
      curPage: 1
    });
    this.getGoodsList(this.data.activeCategoryId);
  },
  onReachBottom: function () {
    this.setData({
      curPage: this.data.curPage+1
    });
    this.getGoodsList(this.data.activeCategoryId, true)
  },
  onPullDownRefresh: function(){
    this.setData({
      curPage: 1
    });
    this.getGoodsList(this.data.activeCategoryId)
  }
})
