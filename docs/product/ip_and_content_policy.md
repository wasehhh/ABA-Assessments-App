# IP and content policy (engineering)

Evalis is a **content-agnostic assessment engine**. Clinics supply their own pack content; the platform provides structure, scoring, and reporting tools.

This is an **engineering guardrail** doc — not legal advice.

---

## Do

- Store user-uploaded or user-built **content packs** per organization (`content_packs.pack_data`).
- Use **generic** identifiers (domain id, target id) in code and exports.
- Freeze **pack snapshots** on assessments for auditability.
- Use Evalis-native visual patterns (Points Captured, Score Bands, Learner Map rows) — see [`visualization/layer_2_visualization_strategy.md`](./visualization/layer_2_visualization_strategy.md) §8.

---

## Do not

- Ship **copyrighted assessment text** (ABLLS-R, VB-MAPP items, etc.) in repo seeds or defaults.
- Reproduce **publisher-style numeric grids** or book layouts in product UI or exports.
- Imply **official partnership** with assessment publishers without contract.
- Enable **cross-org pack sharing** that facilitates piracy.

---

## User responsibility

- UI/disclaimers state the platform provides **tools**, not licensed assessment **content**.
- Org admins are responsible for upload rights to their pack data.

---

## Deeper background (archive)

Full research notes: [`../archive/research/copyright_and_ip.md`](../archive/research/copyright_and_ip.md).

---

_Last reviewed: 2026-06-10._
