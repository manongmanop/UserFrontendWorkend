export function submitProgramFeedback(programId, level) {
  return request(`/workout_programs/${programId}/feedback`, {
    method: "PATCH",
    body: JSON.stringify({ level }),
  });
}
// ===== Histories =====
export function createHistory(payload) {
  return request("/histories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchHistoriesByUid(uid) {
  return request(`/histories/user/${uid}`);
}
