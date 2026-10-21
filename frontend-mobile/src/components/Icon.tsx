import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

const NAMES: Record<string, string> = {
  home: 'home', users: 'people', settings: 'settings', bell: 'notifications', search: 'search',
  clipboard: 'clipboard', user: 'person', stethoscope: 'medkit', alert: 'warning', check: 'checkmark-circle',
  tick: 'checkmark', lungs: 'cloud-outline', heart: 'heart', droplet: 'water', activity: 'pulse',
  thermometer: 'thermometer', lock: 'lock-closed', mail: 'mail', bot: 'chatbubble-ellipses',
  info: 'information-circle', hospital: 'business', help: 'help-circle', arrowLeft: 'arrow-back', cross: 'medical',
};

export default function Icon({ name, size = 22, color = '#6B21A8' }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={NAMES[name] || name} size={size} color={color} />;
}
