function wxpay(app, money, orderId, redirectUrl) {
  let remark = "在线充值";
  let nextAction = {};
  if (orderId != 0) {
    remark = "支付订单 ：" + orderId;
    nextAction = { type: 0, id: orderId };
  }

  let postJsonString = {}
  let orderDetailId = ""
  wx.request({
    url: 'https://api.it120.cc/' + app.globalData.subDomain + '/order/detail',
    data: {
      token: wx.getStorageSync('token'),
      id: orderId
    },
    success: (res) => {
      if (res.data.code != 0) {
        wx.showModal({
          title: '错误',
          content: res.data.msg,
          showCancel: false
        })
        return;
      }
      
      let orderInfo = res.data.data.orderInfo
      orderDetailId = orderInfo.orderNumber
      postJsonString.keyword1 = { value: orderInfo.orderNumber, color: '#173177' }
      postJsonString.keyword2 = { value: orderInfo.amountReal + '元', color: '#173177' }
      postJsonString.keyword3 = { value: orderInfo.dateAdd, color: '#173177' }
      
      let goods = res.data.data.goods
      let goodsName = ""
      for (var i = goods.length - 1; i >= 0; i--) {
        goodsName = goodsName+goods[i].goodsName+' X '+goods[i].number+ ' '
      }
      postJsonString.keyword4 = { value:goodsName, color:'#173177'}
    }
  })


  wx.request({
    url: 'https://api.it120.cc/' + app.globalData.subDomain + '/pay/wx/wxapp',
    data: {
      token: wx.getStorageSync('token'),
      money:money,
      remark: remark,
      payName:"在线支付",
      nextAction: nextAction
    },
    //method:'POST',
    success: function(res){
      if(res.data.code == 0){
        // 发起支付
        wx.requestPayment({
          timeStamp:res.data.data.timeStamp,
          nonceStr:res.data.data.nonceStr,
          package:'prepay_id=' + res.data.data.prepayId,
          signType:'MD5',
          paySign:res.data.data.sign,
          fail:function (aaa) {
            wx.showToast({title: '支付失败:' + aaa})
          },
          success:function () {
            wx.showToast({title: '支付成功'})

            app.sendTempleMsgImmediately('U77IYSSmg3t7n0L_I3qeCgFxtqghV5a5rZfCyxIVIhs',res.data.data.prepayId,
              'pages/index/index', JSON.stringify(postJsonString));
            wx.redirectTo({
              url: redirectUrl
            });
          }
        })
      } else {
        wx.showModal({
          title: '出错了',
          content: res.data.code + ':' + res.data.msg + ':' + res.data.data,
          showCancel: false,
          success: function (res) {

          }
        })
      }
    }
  })
}

module.exports = {
  wxpay: wxpay
}
