import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { Gyroscope } from 'expo-sensors';

import { listDreamsWithTags } from '../db/dreamdb';
// import the compiled html for our web app, bundled/minified by esbuild
import forceGraphHtml from './generated/force-graph-html';

function buildGraphData(dreams) {
    const nodes = [];
    const links = [];
    const tagSet = new Map();

    for (const dream of dreams) {
        const dreamNodeId = `dream-${dream.id}`;
        const name = dream.transcript?.slice(0, 30) ?? 'Untitled';
        nodes.push({
            id: dreamNodeId,
            name: name,
            transcript: dream.transcript,
            type: 'dream',
            dreamId: dream.id,
            tags: dream.tags,
        });

        for (const tag of dream.tags) {
            const tagNodeId = `tag-${tag.id}`;
            if (!tagSet.has(tagNodeId)) {
                tagSet.set(tagNodeId, { id: tagNodeId, name: tag.tag, type: 'tag' });
            }
            links.push({ source: dreamNodeId, target: tagNodeId });
        }
    }

    nodes.push(...tagSet.values());
    return { nodes, links };
}

export const DreamForceGraph = forwardRef(function DreamForceGraph({ onNodeSelect, onBackgroundClick, gyroEnabled = true, style }, ref) {
    const webViewRef = useRef(null);
    const [ready, setReady] = useState(false);

    // useImperativeHandle lets a parent component call methods on this
    // component via a ref (e.g. graphRef.current.focusNode("water")).
    // https://dev.to/cristiansifuentes/mastering-useimperativehandle-in-react-a-step-by-step-guide-for-experts-1pma
    // In React 19+, ref is available as a regular prop — no forwardRef needed.
    useImperativeHandle(ref, () => ({
        // Send a message to the WebView to zoom the camera to a specific
        // node by name.  The WebView's handleMessage looks up the node in
        // the graph data and triggers the same camera animation as a tap.
        focusNode(name, type = 'tag') {
            webViewRef.current?.postMessage(
                JSON.stringify({ type: 'focusNode', payload: { name, type } })
            );
        },
        zoomToFit() {
            webViewRef.current?.postMessage(
                JSON.stringify({ type: 'zoomToFit' })
            );
        },
    }), []);

    const sendData = useCallback(async () => {
        const dreams = await listDreamsWithTags();
        const graphData = buildGraphData(dreams);

        const message = JSON.stringify({ type: 'setGraphData', payload: graphData });
        webViewRef.current?.postMessage(message);
    }, []);

    useEffect(() => {
        if (ready) sendData();
        
    }, [ready, sendData]);

    useEffect(() => {
        if (!ready || !gyroEnabled) {
            webViewRef.current?.postMessage(
                JSON.stringify({ type: 'gyroscope', payload: { x: 0, y: 0 } })
            );
            return;
        }

        Gyroscope.setUpdateInterval(50);
        const sub = Gyroscope.addListener(({ x, y }) => {
            webViewRef.current?.postMessage(
                JSON.stringify({ type: 'gyroscope', payload: { x, y } })
            );
        });

        return () => sub.remove();
    }, [ready, gyroEnabled]);

    // the callback that will handle messages from the web app (e.g. node clicks)
    const onMessage = useCallback((event) => {
        let data;
        try {
            data = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }

        if (data.type === 'ready') {
            setReady(true);
        } else if (data.type === 'nodeClick') {
            onNodeSelect?.(data.payload);
        } else if (data.type === 'backgroundClick') {
            onBackgroundClick?.();
        } else if (data.type === 'console') {
            console.log(`[WebView ${data.level}]`, data.message);
        }
    }, [onNodeSelect]);

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                source={{ html: forceGraphHtml }}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled
                onMessage={onMessage}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                setBuiltInZoomControls={false}
                injectedJavaScript={`
                    (function() {
                        var origLog = console.log;
                        var origError = console.error;
                        var origWarn = console.warn;
                        function send(level, args) {
                            window.ReactNativeWebView?.postMessage(JSON.stringify({
                                type: 'console',
                                level: level,
                                message: Array.from(args).map(String).join(' ')
                            }));
                        }
                        console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
                        console.error = function() { send('error', arguments); origError.apply(console, arguments); };
                        console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
                        window.onerror = function(msg, src, line, col, err) {
                            send('error', ['Uncaught: ' + msg + ' at ' + (src||'') + ':' + line + ':' + col]);
                        };
                        true;
                    })();
                `}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignSelf: 'stretch', /* make this stretch since shared.container has alignItems: 'center' and it has no explicit width */
        overflow: 'hidden',
        borderRadius: 12,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
