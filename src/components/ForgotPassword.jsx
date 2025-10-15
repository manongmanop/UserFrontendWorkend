import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { useUserAuth } from "../context/UserAuthContext";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { resetPassword } = useUserAuth();
  let navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await resetPassword(email);
      setMessage("Check your email for password reset instructions.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-md-6 mx-auto">
          <h2 className="mb-3">Reset Password</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Control
                type="email"
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button variant="primary" type="submit">
                Reset Password
              </Button>
            </div>
          </Form>

          <div className="p-4 box mt-3 text-center">
            Remembered your password? <Button variant="link" onClick={() => navigate("/")}>Login</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
