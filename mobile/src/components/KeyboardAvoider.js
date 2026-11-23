import React, { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// Lifts the screen's content and footer above the keyboard. Android runs
// edge-to-edge, so the window no longer resizes for the keyboard there and
// both platforms need the padding. The padding is the overlap between this
// view and the keyboard, so it stays zero if the window did resize.
export function KeyboardAvoider({ style, children }) {
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// Whether the keyboard is on screen.
export function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setShown(true));
    const hide = Keyboard.addListener(HIDE, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

const FOCUSED = 'inputFocused';

// Text fields call this on focus, so the scroll around them can bring the
// field into view when focus moves while the keyboard is already open.
export function inputFocused() {
  DeviceEventEmitter.emit(FOCUSED);
}

export function onInputFocused(listener) {
  return DeviceEventEmitter.addListener(FOCUSED, listener);
}
