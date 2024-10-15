import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission, useFrameProcessor} from 'react-native-vision-camera';
import {TensorflowModel, useTensorflowModel} from 'react-native-fast-tflite';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {useFocusEffect} from 'expo-router';
import {Worklets} from "react-native-worklets-core";

const classLabels = ['trash', 'glass', 'paper', 'metal', 'plastic', 'cardboard']; // Add your class labels here


export default function App() {
    const {hasPermission, requestPermission} = useCameraPermission();
    const device = useCameraDevice('back');

    // Load the TensorFlow Lite model
    const model = useTensorflowModel(require('../../assets/mobilenet_transfer_model_quantized.tflite'));
    const [actualModel, setActualModel] = useState<TensorflowModel | undefined>(undefined);
    const [predictedClass, setPredictedClass] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<number | null>(null);

    useEffect(() => {
        if (actualModel == null) return;
        console.log(`Model loaded!`);
    }, [actualModel]);

    // Load the model once it's ready
    useEffect(() => {
        if (model.state === 'loaded') {
            setActualModel(model.model);
        }
    }, [model]);

    const {resize} = useResizePlugin();

    const assignPredictedClass = Worklets.createRunOnJS((className: string | null) => {
        setPredictedClass(className)
    })

    const assignConfidence = Worklets.createRunOnJS((value: number | null) => {
        setConfidence(value)
    })

    const frameProcessor = useFrameProcessor(
        (frame) => {
            'worklet';
            if (actualModel == undefined) {
                return; // Wait for the model to load
            }

            const resized = resize(frame, {
                scale: {
                    width: 224,
                    height: 224
                },
                pixelFormat: 'rgb',
                dataType: 'float32'
            });
            const result = actualModel.runSync([resized]);

            // Assuming the model output is a classification probability distribution
            const outputData = result[0];  // Adjust if your model returns multiple outputs
            const maxConfidence = Math.max(...outputData);  // Get the highest confidence score
            const predictedClassIndex = outputData.indexOf(maxConfidence as never);  // Get the index of max confidence
            const confidenceScore = maxConfidence;  // Use the max confidence
            assignPredictedClass(classLabels[predictedClassIndex]);
            assignConfidence(confidenceScore);
        },
        [actualModel]
    );

    useFocusEffect(
        React.useCallback(() => {
            setActualModel(model.model);  // Reload model when screen is focused

            return () => {
                setActualModel(undefined);  // Clean up the model when screen is unfocused
            };
        }, [model.model])
    );

    // Request camera permission on component mount
    useEffect(() => {
        (async () => {
            await requestPermission();
        })();
    }, [requestPermission]);

    return (
        <View style={styles.container}>
            {hasPermission && device != null ? (
                <Camera
                    device={device}
                    style={StyleSheet.absoluteFill}
                    isActive={true}
                    frameProcessor={frameProcessor}
                    pixelFormat="yuv"
                />
            ) : (
                <Text>No Camera available.</Text>
            )}

            {model.state === 'loading' && <ActivityIndicator size="small" color="white"/>}

            {model.state === 'error' && <Text>Failed to load model! {model.error.message}</Text>}

            {predictedClass && confidence !== null && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>
                        Predicted Class: {predictedClass} with Confidence: {(confidence * 100).toFixed(2)}%
                    </Text>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center'
    },
    resultContainer: {
        position: 'absolute',
        bottom: 20,
        width: '100%',
        alignItems: 'center'
    },
    resultText: {
        fontSize: 18,
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5
    }
});
