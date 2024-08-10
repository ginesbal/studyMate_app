import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import CustomTimePickerModal from '../components/pickers/CustomTimePickerModal';

const backgroundColors = [
  '#FFF5E1', // Light Cream
  '#E0F7FA', // Light Cyan
  '#F1F8E9', // Light Green
  '#F9FBE7', // Light Yellow
  '#E3F2FD', // Light Blue
  '#EDE7F6', // Light Purple
];

const motivationalQuotes = [
  "Stay focused and never give up!",
  "Believe in yourself and all that you are.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't watch the clock; do what it does. Keep going.",
];

const StudyTimerScreen: React.FC = () => {
  const { theme } = useTheme();
  const [timer, setTimer] = useState({
    seconds: 0,
    isRunning: false,
    customDuration: 0,
    timerSet: false,
  });
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [quote, setQuote] = useState('');
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState(backgroundColors[0]);
  const [showQuotes, setShowQuotes] = useState(true); // State to toggle quotes

  useEffect(() => {
    if (showQuotes) {
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }
  }, [timer.timerSet, showQuotes]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (timer.isRunning && timer.seconds > 0) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          seconds: prev.seconds - 1,
        }));
      }, 1000);
    } else if (timer.seconds <= 0 && timer.isRunning) {
      stopTimer();
      Alert.alert("Well Done!", 'Your timer has finished.');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.seconds]);

  const startTimer = () => {
    if (timer.customDuration > 0) {
      setTimer(prev => ({
        ...prev,
        isRunning: true,
      }));
    }
  };

  const stopTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
    }));
  };

  const resetTimer = () => {
    const newBackgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    setCurrentBackgroundColor(newBackgroundColor);

    setTimer({
      seconds: 0,
      isRunning: false,
      customDuration: 0,
      timerSet: false,
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleConfirm = (hours: number, minutes: number, seconds: number) => {
    if (hours === 0 && minutes === 0 && seconds === 0) {
      Alert.alert('Invalid Duration', 'Please set a duration greater than 0.');
      return;
    }
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTimer({
      seconds: totalSeconds,
      customDuration: totalSeconds,
      isRunning: false,
      timerSet: true,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: currentBackgroundColor }]}>
      {!timer.timerSet ? (
        <>
          <Text style={[styles.title, { color: theme.textColor }]}>Your studyMate Timer</Text>
          <View style={styles.spacing} />
          {/* Toggle Switch for Motivational Quotes */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: theme.textColor }]}>Show Motivational Quotes</Text>
            <Switch
              value={showQuotes}
              onValueChange={setShowQuotes}
              trackColor={{ false: theme.buttonBackground, true: theme.primaryColor }}
              thumbColor={showQuotes ? theme.primaryColor : theme.secondaryColor}
            />
          </View>
          <View style={styles.spacing} />
          {showQuotes && <Text style={[styles.quote, { color: theme.textColor }]}>{quote}</Text>}
          <View style={styles.spacingLarge} />
          <TouchableOpacity
            onPress={() => setTimePickerVisibility(true)}
            style={[styles.setButton, { backgroundColor: theme.primaryColor }]}
            accessibilityLabel="Set Timer"
          >
            <Text style={[styles.setButtonText, { color: theme.buttonTextColor }]}>
              Set Timer
            </Text>
          </TouchableOpacity>
          <View style={styles.spacingLarge} />
          <CustomTimePickerModal
            visible={isTimePickerVisible}
            onClose={() => setTimePickerVisibility(false)}
            onConfirm={handleConfirm}
            initialHours={Math.floor(timer.customDuration / 3600)}
            initialMinutes={Math.floor((timer.customDuration % 3600) / 60)}
            initialSeconds={timer.customDuration % 60}
          />
        </>
      ) : (
        <>
          <AnimatedCircularProgress
            size={300}
            width={20}
            fill={timer.customDuration > 0 ? ((timer.customDuration - timer.seconds) / timer.customDuration) * 100 : 0}
            tintColor={theme.primaryColor} // Revert to original theme color
            backgroundColor={theme.buttonBackground}
            rotation={0}
            style={styles.circularProgress}
          >
            {() => (
              <Text style={[styles.timerText, { color: theme.textColor }]}>
                {formatTime(timer.seconds)}
              </Text>
            )}
          </AnimatedCircularProgress>
          <View style={styles.spacing} />
          {showQuotes && <Text style={[styles.quote, { color: theme.textColor }]}>{quote}</Text>}
          <View style={styles.spacing} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: timer.isRunning ? theme.secondaryColor : theme.primaryColor }]}
              onPress={timer.isRunning ? stopTimer : startTimer}
              accessibilityLabel={timer.isRunning ? 'Stop timer' : 'Start timer'}
            >
              <Text style={[styles.controlButtonText, { color: theme.buttonTextColor }]}>
                {timer.isRunning ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.secondaryColor }]}
              onPress={resetTimer}
              accessibilityLabel="Reset timer"
            >
              <Text style={[styles.controlButtonText, { color: theme.buttonTextColor }]}>Reset</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quote: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  setButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  setButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  controlButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  circularProgress: {
    marginBottom: 20,
  },
  spacing: {
    height: 20, // Regular spacing
  },
  spacingLarge: {
    height: 40, // Larger spacing for the set timer page
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StudyTimerScreen;
