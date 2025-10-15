import React from "react";
import "./LandingPage.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../style/global.css'
function LandingPage() {
  return (
    <div className="landing-page">
      {/* HERO SECTION */}
      
      <section className="hero position-relative overflow-hidden d-flex flex-column justify-content-center align-items-center text-center text-white">
        {/* <div className="hero-bg position-absolute top-0 start-0 w-50 h-100">
          <img
            src="/images/PushUp.jpg"
            alt="Hero Background"
            className="hero-bg-image"
          />
        </div>
        <div className="hero-overlay position-absolute top-0 start-0 w-100 h-100">
          <img src="/images/PushUp.jpg" alt="Hero Background" className="hero-bg-image" />
        </div> */}
        <div className="hero-content position-relative z-3">
          <h1 className="hero-title display-3 fw-bold mb-4 animate-fade-in">
            ระบบตรวจจับท่าทาง
            <br />
            <span className="text-gradient">และวิเคราะห์การออกกำลังกาย</span>
          </h1>
          <p className="hero-subtitle lead mb-5 animate-fade-in-delay">
            พัฒนาเทรนเนอร์ส่วนตัวของคุณ ด้วย AI
          </p>
          <a
            href="/login"
            className="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow-lg animate-bounce-in"
          >
            <i className="fas fa-play me-2"></i>
            เริ่มต้นใช้งาน
          </a>
        </div>
        {/* <div className="hero-scroll position-absolute bottom-0 start-50 translate-middle-x mb-4">
          <div className="scroll-indicator"></div>
        </div> */}
      </section>

      {/* FEATURES SECTION */}
      <section className="features py-5 bg-light">
        <div className="row justify-content-center text-center mb-5">
          <div className="col-lg-8">
            <h2 className="display-4 fw-bold mb-3">ฟีเจอร์ที่โดดเด่น</h2>
            <p className="lead text-muted">
              ระบบ AI ที่ช่วยให้คุณออกกำลังกายได้อย่างมีประสิทธิภาพ
            </p>
          </div>
        </div>
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4 col-md-4">
              <div className="feature-card h-100 bg-blue-600 rounded-4 shadow-lg p-4 text-center hover-lift">
                <div className="feature-icon-wrapper mb-4">
                  <div className="feature-icon bg-white bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center">
                    <img
                      src="/icons/mediapipe.png"
                      alt="วิเคราะห์ท่าทาง"
                      className="feature-logo"
                    />
                  </div>
                </div>
                <h5 className="text-white fw-bold mb-3">วิเคราะห์ท่าทาง</h5>
                <p className="text-white-50">
                  จับการเคลื่อนไหวอย่างแม่นยำ ด้วยเทคโนโลยี MediaPipe
                </p>
              </div>
            </div>
            <div className="col-lg-4 col-md-4">
              <div className="feature-card h-100 bg-blue-600 rounded-4 shadow-lg p-4 text-center hover-lift">
                <div className="feature-icon-wrapper mb-4">
                  <div className="feature-icon bg-white bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center">
                    <img
                      src="/icons/coach.png"
                      alt="แนะนำโปรแกรม"
                      className="feature-logo"
                    />
                  </div>
                </div>
                <h5 className="text-white fw-bold mb-3">แนะนำโปรแกรม</h5>
                <p className="text-white-50">
                  มีโปรแกรมออกกำลังกายที่คัดสรรโดย Trainer ที่มีประสบการณ์
                </p>
              </div>
            </div>
            <div className="col-lg-4 col-md-4">
              <div className="feature-card h-100 bg-blue-600 rounded-4 shadow-lg p-4 text-center hover-lift">
                <div className="feature-icon-wrapper mb-4">
                  <div className="feature-icon bg-white bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center">
                    <img
                      src="/icons/lose-weight.png"
                      alt="วิเคราะห์ผล"
                      className="feature-logo"
                    />
                  </div>
                </div>
                <h5 className="text-white fw-bold mb-3">วิเคราะห์ผล</h5>
                <p className="text-white-50">
                  ติดตามพัฒนาการและปรับปรุงการออกกำลังกายรายสัปดาห์
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOCKUP SECTION */}
      <section className="mockup-preview py-5 bg-white">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 order-lg-2">
              <div className="mockup-frame position-relative">
                <div className="mockup-shadow"></div>
                <div className="mockup-device bg-dark rounded-4 p-3">
                  <div
                    className="mockup-screen bg-white rounded-3 d-flex align-items-center justify-content-center"
                    style={{ height: "500px" }}
                  >
                    <div className="text-center">
                      <div className="mockup-frame">
                        <img
                          src="/images/mockup.png"
                          alt="Mockup"
                          className="mockup-image"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature col-lg-6 order-lg-1">
              <div className="pe-lg-5">
                <h2 className="display-5 fw-bold mb-4">
                  หน้าตาแอปพลิเคชัน
                  <br />
                  <span className="text-blue-600">ที่ใช้งานง่าย</span>
                </h2>
                <p className="lead mb-4">
                  ออกแบบมาให้ใช้งานง่าย สวยงาม
                  และตอบสนองต่อการใช้งานได้อย่างรวดเร็ว
                </p>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="d-flex align-items-center ">
                      <i className="fas fa-check-circle text-blue-600 me-2"></i>
                      <span>ใช้งานง่าย</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle text-blue-600 me-2"></i>
                      <span>ตอบสนองเร็ว</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle text-blue-600 me-2"></i>
                      <span>ปลอดภัย</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle text-blue-600 me-2"></i>
                      <span>ใช้ฟรี</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section bg-blue-600 bg-gradient text-white py-5">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="display-5 fw-bold mb-4">
                พร้อมเริ่มต้นแล้วหรือยัง?
              </h2>
              <p className="lead mb-4">
                เข้าร่วมกับผู้ใช้งานหลายพันคนที่เลือกใช้ระบบของเรา
              </p>
              <a
            href="/login"
            className="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow-lg animate-bounce-in"
          >
            <i className="fas fa-play me-2"></i>
            เริ่มต้นใช้งาน
          </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-dark text-white py-5">
        <div className="container">
          <div className="row g-4">
            {/* Company Info Section */}
            <div className="col-lg-4 col-md-8">
              <div className="footer-brand mb-4">
                <h4 className="fw-bold text-primary mb-3">
                  <i className="fas fa-dumbbell me-2"></i>
                  FitPose AI
                </h4>
                <p className="text-light-emphasis mb-3">
                  เทคโนโลยี AI
                  ที่ช่วยให้คุณออกกำลังกายได้อย่างมีประสิทธิภาพและปลอดภัย
                  ด้วยการตรวจจับท่าทางแบบเรียลไทม์
                </p>
                {/* <div className="d-flex align-items-center text-light-emphasis">
            <i className="fas fa-award text-warning me-2"></i>
            <small>รางวัล Best AI Fitness App 2024</small>
          </div> */}
              </div>
            </div>

            {/* Quick Links */}
            {/* <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-3 text-primary">ลิงก์ด่วน</h6>
              <ul className="list-unstyled footer-links">
                <li className="mb-2">
                  <a
                    href="#home"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-home me-2"></i>หน้าหลัก
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#about"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-info-circle me-2"></i>เกี่ยวกับเรา
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#features"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-star me-2"></i>ฟีเจอร์
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#pricing"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-tags me-2"></i>ราคา
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#contact"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-envelope me-2"></i>ติดต่อ
                  </a>
                </li>
              </ul>
            </div> */}

            {/* Features */}
            {/* <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-3 text-primary">ฟีเจอร์หลัก</h6>
              <ul className="list-unstyled footer-links">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-eye me-2"></i>ตรวจจับท่าทาง
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-chart-line me-2"></i>วิเคราะห์ผล
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-calendar-alt me-2"></i>จัดตารางเวลา
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-users me-2"></i>ชุมชน
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-mobile-alt me-2"></i>แอปมือถือ
                  </a>
                </li>
              </ul>
            </div> */}

            {/* Support */}
            {/* <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-3 text-primary">ช่วยเหลือ</h6>
              <ul className="list-unstyled footer-links">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-question-circle me-2"></i>
                    คำถามที่พบบ่อย
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-life-ring me-2"></i>ศูนย์ช่วยเหลือ
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-book me-2"></i>คู่มือการใช้งาน
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-shield-alt me-2"></i>
                    นโยบายความเป็นส่วนตัว
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none hover-link"
                  >
                    <i className="fas fa-file-contract me-2"></i>
                    เงื่อนไขการใช้งาน
                  </a>
                </li>
              </ul>
            </div> */}

            {/* Contact & Social */}
            {/* <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-3 text-primary">ติดต่อเรา</h6>
              <div className="contact-info mb-3">
                <div className="mb-2">
                  <a
                    href="mailto:support@fitpose.ai"
                    className="text-decoration-none text-light-emphasis hover-link d-flex align-items-center"
                  >
                    <i className="fas fa-envelope text-primary me-2"></i>
                    <span>support@fitpose.ai</span>
                  </a>
                </div>
                <div className="mb-2">
                  <a
                    href="mailto:info@fitpose.ai"
                    className="text-decoration-none text-light-emphasis hover-link d-flex align-items-center"
                  >
                    <i className="fas fa-info-circle text-primary me-2"></i>
                    <span>info@fitpose.ai</span>
                  </a>
                </div>
                <div className="mb-3">
                  <a
                    href="mailto:business@fitpose.ai"
                    className="text-decoration-none text-light-emphasis hover-link d-flex align-items-center"
                  >
                    <i className="fas fa-briefcase text-primary me-2"></i>
                    <span>business@fitpose.ai</span>
                  </a>
                </div>
              </div>
            </div> */}
            {/* Divider */}
            <hr className="my-4 border-secondary" />
            {/* Bottom Section */}
            <div className="row align-items-center">
              <div className="col-md-6">
                <p className="mb-0 text-light-emphasis">
                  © 2025 <strong className="text-primary">FitPose AI</strong> -
                  ระบบตรวจจับท่าทางด้วย AI | สงวนลิขสิทธิ์ทุกประการ
                </p>
              </div>
              {/* <div className="col-md-6 text-md-end">
                <div className="d-flex justify-content-md-end justify-content-start gap-3 mt-2 mt-md-0">
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none small hover-link"
                  >
                    นโยบายความเป็นส่วนตัว
                  </a>
                  <span className="text-muted">|</span>
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none small hover-link"
                  >
                    เงื่อนไขการใช้งาน
                  </a>
                  <span className="text-muted">|</span>
                  <a
                    href="#"
                    className="text-light-emphasis text-decoration-none small hover-link"
                  >
                    คุกกี้
                  </a>
                </div>
              </div> */}
            </div>
          </div>

          {/* Back to Top Button */}
          <div className="position-fixed bottom-0 end-0 p-3">
            <button
              className="btn btn-primary rounded-circle shadow-lg back-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="กลับสู่ด้านบน"
              data-bs-toggle="tooltip"
            >
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
