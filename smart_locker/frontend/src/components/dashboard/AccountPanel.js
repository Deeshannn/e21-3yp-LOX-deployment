import React from 'react';

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

async function fileToCompressedDataUrl(file, maxWidth = 1280, maxHeight = 1280, quality = 0.78) {
  const imageSource = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not process the selected image.'));
    element.src = imageSource;
  });

  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare the image background.');
  }

  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

function AccountPanel({ user, profileForm, onProfileFormChange, onSubmit }) {
  const displayAvatar = profileForm.avatarUrl || user.avatarUrl || '';
  const displayBackground = profileForm.homeBackgroundUrl || user.homeBackgroundUrl || '';

  const handleDesktopAvatarUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToCompressedDataUrl(file, 512, 512, 0.82);
      onProfileFormChange('avatarUrl', dataUrl);
    } catch (error) {
      onProfileFormChange('avatarUrl', '');
      window.alert(error.message || 'Could not load the selected profile image.');
    }

    event.target.value = '';
  };

  const handleDesktopBackgroundUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onProfileFormChange('homeBackgroundUrl', dataUrl);
    } catch (error) {
      onProfileFormChange('homeBackgroundUrl', '');
      window.alert(error.message || 'Could not load the selected background image.');
    }

    event.target.value = '';
  };

  return (
    <section className="panel account-panel">
      <div className="section-heading">
        <h2>My Account</h2>
        <p>Update your profile details and keep your locker account information current.</p>
      </div>

      <div className="account-layout">
        <aside className="profile-card">
          <div className="profile-avatar">
            {displayAvatar ? <img src={displayAvatar} alt={`${profileForm.name || user.name} profile`} /> : <span>{getInitials(profileForm.name || user.name)}</span>}
          </div>
          <div className="profile-meta">
            <strong>{profileForm.name || user.name}</strong>
            <span>{profileForm.jobTitle || 'Locker user'}</span>
            <span>{profileForm.email || user.email}</span>
          </div>
        </aside>

        <form className="panel account-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Full name</span>
            <input
              value={profileForm.name}
              onChange={(e) => onProfileFormChange('name', e.target.value)}
              required
            />
          </label>

          <label>
            <span className="field-label">Email</span>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => onProfileFormChange('email', e.target.value)}
              required
            />
          </label>

          <div className="mini-card background-upload-card">
            <div className="section-heading">
              <h3>Profile Picture</h3>
              <p>Upload a picture from your computer to use as your profile image.</p>
            </div>

            <div className="background-preview profile-preview" style={displayAvatar ? { backgroundImage: `url("${displayAvatar}")` } : undefined}>
              {displayAvatar ? <span>Profile preview</span> : <span>No profile picture selected</span>}
            </div>

            <div className="actions background-actions">
              <label className="upload-button">
                <span>Upload from computer</span>
                <input type="file" accept="image/*" onChange={handleDesktopAvatarUpload} />
              </label>
            </div>
          </div>

          <label>
            <span className="field-label">Phone number</span>
            <input
              value={profileForm.phone}
              onChange={(e) => onProfileFormChange('phone', e.target.value)}
              placeholder="07x xxx xxxx"
            />
          </label>

          <div className="mini-card background-upload-card">
            <div className="section-heading">
              <h3>Home Background</h3>
              <p>Upload an image from your desktop to use it as the home layout background.</p>
            </div>

            <div className="background-preview" style={displayBackground ? { backgroundImage: `url("${displayBackground}")` } : undefined}>
              {displayBackground ? <span>Background preview</span> : <span>No background selected</span>}
            </div>

            <div className="actions background-actions">
              <label className="upload-button">
                <span>Upload desktop image</span>
                <input type="file" accept="image/*" onChange={handleDesktopBackgroundUpload} />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() => onProfileFormChange('homeBackgroundUrl', '')}
                disabled={!displayBackground}
              >
                Remove Background
              </button>
            </div>
          </div>

          <label>
            <span className="field-label">Job title</span>
            <input
              value={profileForm.jobTitle}
              onChange={(e) => onProfileFormChange('jobTitle', e.target.value)}
              placeholder="Student, Staff, Admin..."
            />
          </label>

          <label>
            <span className="field-label">Bio</span>
            <textarea
              rows="4"
              value={profileForm.bio}
              onChange={(e) => onProfileFormChange('bio', e.target.value)}
              placeholder="Short profile description"
            />
          </label>

          <div className="account-actions actions">
            <button type="submit">Save Profile</button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default AccountPanel;
