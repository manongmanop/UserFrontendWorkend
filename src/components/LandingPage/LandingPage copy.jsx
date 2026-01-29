import React from "react";

function LandingPage() {
  return (
    <div className="minimal-landing">
      {/* MINIMAL HERO SECTION */}
      <section className="minimal-hero">
        <div className="hero-wrapper">
          {/* Header Navigation */}
          <nav className="minimal-nav">
            <div className="nav-brand">
              <span className="brand-text">FitPose</span>
            </div>
            <div className="nav-links">
              <a href="#features" className="nav-link">ฟีเจอร์</a>
              <a href="#" className="nav-link">เกี่ยวกับ</a>
              <a href="#" className="cta-link">เข้าสู่ระบบ</a>
            </div>
          </nav>

          {/* Main Hero Content */}
          <div className="hero-main">
            <div className="hero-left">
              <div className="headline-wrapper">
                <h1 className="hero-headline">
                  ออกกำลังกาย<br />
                  <span className="highlight">อย่างถูกวิธี</span>
                </h1>
              </div>

              <p className="hero-description">
                ระบบ AI ที่ช่วยให้คุณออกกำลังกายได้อย่างมีประสิทธิภาพ
                ด้วยการตรวจจับท่าทางแบบเรียลไทม์
              </p>

              <div className="hero-cta">
                <button className="btn-primary-minimal">เริ่มต้นใช้งาน</button>
                <button className="btn-secondary-minimal">ดูสาธิต</button>
              </div>

              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">10K+</span>
                  <span className="stat-label">ผู้ใช้</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat">
                  <span className="stat-number">98%</span>
                  <span className="stat-label">ความพึงพอใจ</span>
                </div>
              </div>
            </div>

            <div className="hero-right">
              <div className="device-showcase">
                <div className="phone-frame">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    <div className="screen-demo">
                      <div className="demo-circle">
                        <img
                          src="/images/mockup.png"
                          alt="Mockup"
                          className="mockup-image"
                        />
                      </div>
                      <div className="demo-text">เรียนรู้อย่าง<br />อัจฉริยะ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-hint">
            <span className="scroll-text">เลื่อนลงเพื่อสำรวจ</span>
            <svg className="scroll-arrow" width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 15L5 10H15L10 15Z" fill="currentColor" opacity="0.5" />
              <path d="M10 10L5 5H15L10 10Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="minimal-features" id="features">
        <div className="section-wrapper">
          <h2 className="section-title">สิ่งที่คุณจะได้</h2>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-number">01</div>
              <h3 className="feature-name">ตรวจจับท่า</h3>
              <p className="feature-desc">AI ตรวจจับท่าทางของคุณแบบเรียลไทม์</p>
            </div>

            <div className="feature-item">
              <div className="feature-number">02</div>
              <h3 className="feature-name">แนะนำทันที</h3>
              <p className="feature-desc">รับคำแนะนำในการปรับปรุงท่าของคุณ</p>
            </div>

            <div className="feature-item">
              <div className="feature-number">03</div>
              <h3 className="feature-name">ติดตามผล</h3>
              <p className="feature-desc">วิเคราะห์ความก้าวหน้าของคุณ</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="minimal-cta">
        <div className="cta-wrapper">
          <h2>พร้อมเริ่มต้นหรือยัง?</h2>
          <p>ไม่มีบัตรเครดิต จำเป็น</p>
          <button className="btn-primary-minimal btn-large">สมัครสมาชิกฟรี</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="minimal-footer">
        <p>&copy; 2025 FitPose AI. สงวนลิขสิทธิ์ทุกประการ</p>
      </footer>
    </div>
  );
}

export default LandingPage;