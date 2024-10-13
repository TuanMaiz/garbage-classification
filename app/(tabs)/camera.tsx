import { ThemedView } from '@/components/ThemedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Button, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as tf from '@tensorflow/tfjs'
import { cameraWithTensors } from '@tensorflow/tfjs-react-native'
import * as mobilenet from '@tensorflow-models/mobilenet'
import Canvas, { CanvasRenderingContext2D } from 'react-native-canvas';

const TensorCamera = cameraWithTensors(CameraView);
const { width, height } = Dimensions.get('window');

export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const canvasRef = useRef<Canvas>()
  const [isTfReady, setIsTfReady] = useState<boolean>(false);
  const [on, setOn] = useState<boolean>(false);

  const [model, setModel] = useState<mobilenet.MobileNet>();
  const canvas = useRef<Canvas>();
  let context = useRef<CanvasRenderingContext2D>();

  let textureDims;
  Platform.OS === 'ios'
    ? (textureDims = { height: 1920, width: 1080 })
    : (textureDims = { height: 1200, width: 1600 });
    useEffect(() => {
      console.log('Component mounted');
      async function setup() {
        try {
          console.log('Setting up TensorFlow.js');
          await tf.ready();
          console.log('TensorFlow.js ready');
          const model = await mobilenet.load();
          console.log('Model loaded');
          setModel(model);
          setIsTfReady(true);
        } catch (error) {
          console.error('Error during setup:', error);
        }
      }
      setup();
      return () => {
        console.log('Component unmounting');
        setOn(false);
      }
    }, []);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Bật camera" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }
  const handleCanvas = async (can: Canvas) => {
    if (can) {
      can.width = width;
      can.height = height;
      const ctx: CanvasRenderingContext2D = can.getContext('2d');
      context.current = ctx;
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';
      ctx.lineWidth = 3;
      canvas.current = can;
    }
  };
  function drawRectangle(
    predictions: any,
    nextImageTensor: any
  ) {
    if (!context.current || !canvas.current) {
      console.log('no context or canvas');
      return;
    }

    console.log(predictions);

    // to match the size of the camera preview
    const scaleWidth = width / nextImageTensor.shape[1];
    const scaleHeight = height / nextImageTensor.shape[0];

    const flipHorizontal = Platform.OS === 'ios' ? false : true;

    // We will clear the previous prediction
    context.current.clearRect(0, 0, width, height);

    // Draw the rectangle for each prediction
    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;

      // Scale the coordinates based on the ratios calculated
      const boundingBoxX = flipHorizontal
        ? canvas.current.width - x * scaleWidth - width * scaleWidth
        : x * scaleWidth;
      const boundingBoxY = y * scaleHeight;

      // Draw the bounding box.
      context.current.strokeRect(
        boundingBoxX,
        boundingBoxY,
        width * scaleWidth,
        height * scaleHeight
      );
      // Draw the label
      context.current.fillText(
        prediction.class,
        boundingBoxX - 5,
        boundingBoxY - 5
      );
    }
  }
  function handleCameraStream(images: any) {
    console.log('handleCameraStream');
    const loop = async () => {
      const nextImageTensor = images.next().value;
      console.log('looping')
      // if (!model || !nextImageTensor) throw new Error('no model');

      // model
      //   .classify(nextImageTensor)
      //   .then((predictions) => {
      //     drawRectangle(predictions, nextImageTensor);
      //   })
      //   .catch((err) => {
      //     console.log(err);
      //   });

      requestAnimationFrame(loop);
    };
    loop();
  }

  return (
    <View style={styles.container}>
      {
        !on ? (
          <ThemedView style={styles.buttonContainer}>
            <TouchableOpacity style={styles.buttonTurnOnCamera} onPress={() => setOn(true)}>
              <Text style={styles.text}>Bật camera</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : 
        isTfReady && model ? (
          <View style={styles.container}>
            <TensorCamera
            // Standard Camera props
            style={styles.camera}
            facing={facing}
            // Tensor related props
            cameraTextureHeight={textureDims.height}
            cameraTextureWidth={textureDims.width}
            resizeHeight={200}
            resizeWidth={152}
            resizeDepth={3}
            onReady={handleCameraStream}
            autorender={true}
            useCustomShadersToResize={false}
          />
            <Canvas style={styles.canvas} ref={handleCanvas} />
            <TouchableOpacity style={styles.backButton} onPress={() => setOn(false)}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
          </View>
        ) : (
          <Text style={{textAlign: 'center', color: 'white'}}>Loading...</Text> 
        )
      }
      {/* {
        on && isTfReady ? (
          <View style={styles.container}>
            <TensorCamera
            // Standard Camera props
            style={styles.camera}
            facing={facing}
            // Tensor related props
            cameraTextureHeight={textureDims.height}
            cameraTextureWidth={textureDims.width}
            resizeHeight={200}
            resizeWidth={152}
            resizeDepth={3}
            onReady={handleCameraStream}
            autorender={true}
            useCustomShadersToResize={false}
          />
            <Canvas style={styles.canvas} ref={handleCanvas} />
            <TouchableOpacity style={styles.backButton} onPress={() => setOn(false)}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
          </View>
          
        ) : (
          <ThemedView style={styles.buttonContainer}>
            <TouchableOpacity style={styles.buttonTurnOnCamera} onPress={() => setOn(true)}>
              <Text style={styles.text}>Bật camera</Text>
            </TouchableOpacity>
          </ThemedView>
        )
      } */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'white',
    padding: 10
  },
  buttonTurnOnCamera: {
    flex: 1,
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'lime',
  },
  text: {
    fontSize: 24,
    fontWeight: 'semibold',
    color: '#0E233B',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 30,
    zIndex: 1000,
  },
  canvas: {
    position: 'absolute',
    zIndex: 100,
    width: '100%',
    height: '100%',
  },
});
