import { ThemedView } from '@/components/ThemedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as tf from '@tensorflow/tfjs'
import { cameraWithTensors } from '@tensorflow/tfjs-react-native'
import Canvas, { CanvasRenderingContext2D } from 'react-native-canvas';


export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const canvasRef = useRef<Canvas>()
  const [isTfReady, setIsTfReady] = useState<boolean>(false);
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    async function setup()
    {
      await tf.ready();
      setIsTfReady(true);
    }
    setup();
  }, [])

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
  const handleCameraStream = (images: IterableIterator<tf.Tensor3D>) => {
    const loop = async () => {
      if (canvasRef.current) {
        const nextImageTensor = images.next().value;
        if (nextImageTensor) {
          // Perform AI detection here
          // For example purposes, we'll just draw a rectangle
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 50, 100, 100);
          }
          tf.dispose(nextImageTensor);
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  return (
    <View style={styles.container}>
      {
        on ? (
          <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing}>
              <TouchableOpacity style={styles.backButton} onPress={() => setOn(false)}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                  <Text style={styles.text}>Xoay Camera</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <ThemedView style={styles.buttonContainer}>
            <TouchableOpacity style={styles.buttonTurnOnCamera} onPress={() => setOn(true)}>
              <Text style={styles.text}>Bật camera</Text>
            </TouchableOpacity>
          </ThemedView>
        )
      }
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
    zIndex: 10,
  },
});
