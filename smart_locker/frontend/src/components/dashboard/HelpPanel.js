import React from 'react';

function HelpPanel() {
  return (
    <section className="panel help-panel">
      <div className="section-heading">
        <h2>Help</h2>
        <p>Use these steps if you need locker access or support.</p>
      </div>

      <div className="help-layout">
        <div className="panel">
          <h3>Emergency contacts</h3>
          <div className="contact-list">
            <article className="contact-row">
              <strong>Campus Security</strong>
              <span>+94 11 555 0101</span>
              <span>security@smartlocker.local</span>
            </article>
            <article className="contact-row">
              <strong>Locker Support Desk</strong>
              <span>+94 11 555 0102</span>
              <span>support@smartlocker.local</span>
            </article>
            <article className="contact-row">
              <strong>System Administrator</strong>
              <span>+94 11 555 0103</span>
              <span>admin@smartlocker.local</span>
            </article>
          </div>
        </div>

        <div className="panel">
          <h3>Request guide</h3>
          <ol className="guide-list">
            <li>Open <strong>Home</strong> and choose your locker station from <strong>Request Locker Access</strong>.</li>
            <li>Submit the request and wait for approval from a sub-admin or super admin.</li>
            <li>When approved, open <strong>My Locker Access</strong> to see your active locker card and locker grid.</li>
            <li>Use the locker controls only after approval. If the locker is released, the access card will disappear.</li>
            <li>Use <strong>Queue</strong> to follow your waiting position if no locker is available.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export default HelpPanel;
