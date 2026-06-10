      'use strict'
      //定义三维视图的主要类
      let map, sceneView, viewer, animation, graphicsLayer
      //取得jquery对象
      let $ = layui.$
      //脚底动态圆
      let circleWave = null
      //滑动条管理器对象
      let slider = layui.slider
      let pathPositions = [
        {
          x: -2273175.578013623,
          y: 5010638.458497225,
          z: 3215157.5186911672
        },
        {
          x: -2273186.15173117,
          y: 5010663.3702553185,
          z: 3215111.5241055344
        },
        {
          x: -2273186.059557918,
          y: 5010665.8169212,
          z: 3215107.815526737
        },
        {
          x: -2273143.314663209,
          y: 5010712.162479221,
          z: 3215066.039824561
        },
        {
          x: -2273141.8576728688,
          y: 5010714.347794549,
          z: 3215063.717603765
        },
        {
          x: -2273140.8739640433,
          y: 5010753.004724801,
          z: 3215004.560829764
        },
        {
          x: -2273138.540278631,
          y: 5010754.703344927,
          z: 3215003.5664240783
        },
        {
          x: -2273111.358422647,
          y: 5010766.642102002,
          z: 3215004.1472902703
        },
        {
          x: -2273098.2845368856,
          y: 5010771.008773392,
          z: 3215006.5834648367
        },
        {
          x: -2273085.2149581,
          y: 5010776.224484442,
          z: 3215007.6874420852
        },
        {
          x: -2273060.1194440527,
          y: 5010787.107324429,
          z: 3215008.4596388526
        },
        {
          x: -2273052.268879898,
          y: 5010789.153232572,
          z: 3215010.8286537277
        },
        {
          x: -2273048.5740574095,
          y: 5010788.136685532,
          z: 3215014.9750527814
        },
        {
          x: -2273046.2069158386,
          y: 5010783.903650803,
          z: 3215023.2289560195
        },
        {
          x: -2273013.225191267,
          y: 5010711.003592086,
          z: 3215159.227493635
        },
        {
          x: -2273003.7530798647,
          y: 5010714.871967782,
          z: 3215159.9395025484
        },
        {
          x: -2272998.104067287,
          y: 5010714.851373358,
          z: 3215163.939958693
        },
        {
          x: -2272994.7856738493,
          y: 5010712.621812783,
          z: 3215169.731864345
        },
        {
          x: -2272989.1095662955,
          y: 5010699.273869096,
          z: 3215194.3994706264
        }
      ]

      //地图初始化函数
      function init() {
        //初始化球体
        initViewer()
        //创建切换Cesium版本的按钮
        createChangeTab()
        //添加天地图
        addTDT()
        //添加中地大楼模型
        addZondyBuilding()
        //初始化漫游
        initAnimation()
        //初始化UI
        initUI()
        // 开始漫游
        startRoaming()
      }

      //初始化球体
      function initViewer() {
        //初始化图层管理容器
        map = new zondy.Map()
        //初始化地图视图对象
        sceneView = new zondy.cesium.SceneView({
          //视图id
          viewId: 'mapgis-3d-viewer',
          //图层管理容器
          map: map
        })
        //获取视图对象
        viewer = sceneView.getInnerView()
      }

      //加载天地图底图
      function addTDT() {
        let TDTLayer = new zondy.layer.WMTSLayer({
          // 加载经纬度的影像地图
          url: 'http://t6.tianditu.gov.cn/vec_c/wmts',
          // 天地图必须加token，且token名为tk
          tokenKey: 'tk',
          // token请在天地图官网申请
          tokenValue: getTDTToken()
        })
        map.add(TDTLayer)
      }

      //加载中地大楼
      function addZondyBuilding() {
        let url =
          'http://10.10.130.72:8200/3DData/ModelCache/M3D//1.0/ZondyFaceModels/ZondyFaceModels.mcj'
        let M3DLayer = new zondy.layer.M3DModelCacheLayer({
          url: url,
          extensionOptions: {
            // 开启自动跳转
            autoReset: false
          }
        })
        map.add(M3DLayer)
      }

      // 初始化漫游
      function initAnimation() {
        // 定义动画漫游对象
        // 参考API: http://10.10.130.72:8086/static/modules/cesium/api/cesium-mapgis/AnimationTool.html
        animation = new zondy.cesium.AnimationTool(viewer, {
          // 漫游的方向角
          heading: Cesium.Math.toRadians(0),
          // 漫游的俯仰角
          pitch: Cesium.Math.toRadians(0),
          // 设置漫游的视角类型。0：正常，不移动相机；1：跟随；2：锁定第一视角；3：上帝视角
          animationType: 1,
          // 是否循环漫游动画
          isLoop: true,
          // 是否显示漫游路径
          showPath: true,
          // 漫游路径(世界坐标点数组)
          positions: pathPositions,
          // 切换跟随视角下的鼠标点击事件
          followSwitchMouseEvent: true,
          // 开始路径漫游跳转点的上一个路径点的索引
          startPositionIndex: 0,
          // 距离startPositionIndex索引点的距离，单位是m
          offsetStartPositionDistance: 0,
          // 漫游速度(m/s)
          speed: 5,
          // 倍速
          speedupFactor: 1,
          // 附加高程
          exHeight: 0,
          // 是否显示用时和距离提示信息
          showInfo: true,
          // 漫游的模型对象的url
          modelUrl: 'http://10.10.130.72:8200/3DData/Model/glb/walk_man.glb',
          //模型对象参数，详见ModelGraphics对象的文档
          model: {
            //放大比例
            scale: 2,
            //固定大小设为0
            minimumPixelSize: 0
          },
          // 完成漫游后的回调函数
          complete: function () {
            removeCircle()
          },
          // 路径插值算法。可选：拉格朗日算法Cesium.LagrangePolynomialApproximation、线性插值 Cesium.LinearApproximation、埃尔米特插值插值Cesium.HermitePolynomialApproximation
          interpolationAlgorithm: Cesium.LinearApproximation,
          //是否获取当前点坐标，为true时，需配合返回当前点坐标的回调函数callBack一起使用
          isGetPositionNow: true,
          //是否执行回调函数
          onPositionTag: true,
          //回调函数，返回当前所在点坐标
          callback: function (data) {
            if (circleWave) {
              // 动态更新圆特效的位置
              circleWave.position = new Cesium.CallbackProperty(function () {
                return data.position
              }, false)
            }
          },
          //是否设置模型运动姿态，保持朝向与运动方向一致
          isSetModelPosture: true,
          //是否需要将较大转弯点处理为圆弧
          isProcessCorner: false,
          //设置判断为转弯点的角度的最大值，不超过150的转角会被执行插值，处理为圆弧
          maxAngle: 150.0,
          //转弯处往圆弧曲线上插值点的步长，点个数=1/curveStep
          curveStep: 0.01,
          // 是否挂载动态扫描特效
          isAddScanEffect: false,
          // 扫描特效实例，可以是动态圆，也可以是雷达扫描
          scanEffect: undefined,
          // 是否获取路径点的真实高程
          isGetRealHeight: true,
          // 速度变化时，各个路径点对应的速度
          speedArray: undefined,
          // 各路径点对应的时间点
          timeArray: undefined,
          // 加速度数组
          accelerationArray: undefined,
          // 用于判断当前点是否在路径点所在位置附近的精度
          disFactor: 10
        })
      }

      //初始化示例UI
      function initUI() {
        // 跳转路径索引
        slider.render({
          elem: '#startPositionIndex',
          value: 0,
          min: 0,
          max: pathPositions.length - 2,
          step: 1,
          theme: 'rgb(102 147 251)',
          input: true,
          change: function (value) {
            $('#startPositionIndex-input').val(value)
            animation.startPositionIndex = parseInt(value)
            animation.animationType = 1
            // 需要结束漫游再开始才生效
            stopRoaming()
            startRoaming()
          }
        })
        // 距索引点距离
        slider.render({
          elem: '#offsetStartPositionDistance',
          value: 0,
          min: 0.0,
          max: 500.0,
          step: 1,
          theme: 'rgb(102 147 251)',
          input: true,
          change: function (value) {
            $('#offsetStartPositionDistance-input').val(value)
            animation.offsetStartPositionDistance = value
            animation.animationType = 1
            // 需要结束漫游再开始才生效
            stopRoaming()
            startRoaming()
          }
        })
      }

      //增加动态圆
      function addCircle() {
        // 添加动态圆特效实体，详见Entity文档
        if (!circleWave) {
          circleWave = viewer.entities.add({
            name: 'dynamic Circle',
            ellipse: {
              semiMinorAxis: 1.0,
              semiMajorAxis: 1.0,
              height: 8,
              heightReference: 2,
              material: new zondy.cesium.CircleWaveMaterialProperty({
                duration: 1000,
                gradient: 0.5,
                color: Cesium.Color.ORANGE,
                count: 4
              })
            }
          })
        }
      }

      //移除动态圆
      function removeCircle() {
        if (circleWave) {
          viewer.entities.remove(circleWave)
          circleWave = null
        }
      }

      //开始漫游
      function startRoaming() {
        addCircle()
        animation.start()
      }

      //暂停漫游
      function pauseRoaming() {
        animation.pause = !animation.pause
      }

      //结束漫游
      function stopRoaming() {
        removeCircle()
        animation.stop()
      }