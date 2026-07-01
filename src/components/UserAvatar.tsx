import React from 'react';

export function getInitials(firstName?: string | null, lastName?: string | null, displayName?: string | null) {
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  if (displayName) {
    const parts = displayName.split(' ').filter(n => n.length > 0);
    if (parts.length > 1) {
      return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  return 'U';
}

export function UserAvatar({ profile, className = "" }: { profile: any, className?: string }) {
  if (profile?.photoUrl || profile?.photoURL) {
    return (
      <img 
        src={profile.photoUrl || profile.photoURL} 
        alt="Profile" 
        className={`object-cover rounded-full ${className}`} 
      />
    );
  }

  const initials = getInitials(profile?.firstName, profile?.lastName, profile?.displayName);

  return (
    <div className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500/40 to-fuchsia-500/40 text-white font-bold border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.4)] backdrop-blur-sm ${className}`}>
      {initials}
    </div>
  );
}
