// The CV: everything the CV viewer (js/cv-viewer.js) shows, in one place.
// This file has its own copy of the header and contact fields (name, role,
// city, email, link, location); js/profile.js (visiting card, title screen,
// .vcf) is separate and still placeholder.
// Adding or removing a role, school, project or skill is one entry in its list.

window.CV = {
  name: "Zurab Lomidze",
  role: "Project Manager",
  city: "Prague",
  email: "zurablomidze99@gmail.com",
  link: { label: "linkedin.com/in/zurablomidze", url: "https://linkedin.com/in/zurablomidze" },
  location: "Prague, Czech Republic",

  photo: "",                                  // path to a photo; empty shows the "PHOTO" placeholder
  // The PDF is the formal CV (the viewer's View PDF and Download PDF links).
  // The viewer's data below must match it. pdfName is the saved file's name.
  pdf: "assets/zurab-lomidze-cv.pdf",
  pdfName: "Zurab-Lomidze-CV.pdf",
  summary: "Project Management Intern at HP Inc. coordinating enterprise systems, vendor onboarding, and operational governance across EMEA workstreams. Master's candidate in Innovation Project Management at UCT Prague specializing in IS implementation complexity.",

  // Skill chips in groups, each under its own small heading.
  skills: [
    { group: "Governance & Delivery", items: ["RAID Logs", "UAT Governance", "SOP Development", "Stakeholder Alignment"] },
    { group: "Automation & Analytics", items: ["Process Automation", "Power Automate", "Copilot Studio", "Advanced Excel", "Power BI"] },
    { group: "Enterprise Systems", items: ["SAP S/4HANA", "Oracle EBS"] },
  ],

  languages: [
    { name: "Georgian", level: "Native (C2)" },
    { name: "English", level: "Fluent (C2)" },
    { name: "Russian", level: "Intermediate (B1)" },
    { name: "Czech", level: "Beginner (A1)" },
  ],

  // Newest first. The right column shows Experience, Projects, Education.
  experience: [
    { title: "Project Management Intern (Logistics)", company: "HP Inc. (Tech)", years: "2025 — Present", text: "Coordinating cross-functional enterprise system migrations, partner onboarding, and UAT readiness gates across EMEA workstreams." },
    { title: "Project Assistant", company: "Persona Signs (Manufacturing)", years: "2022 — 2023", text: "Managed 15–20 active client projects concurrently, generating purchase orders in Oracle EBS and tracking installation milestones in Oracle Sales Cloud." },
    { title: "Enterprise Project Manager Intern", company: "Sanford Health (Healthcare)", years: "2021 — 2021", text: "Authored enterprise Master Statistics SOP adopted by the Board of Trustees; configured SharePoint PMO governance tools and KPI health dashboards." },
    { title: "Business Intelligence Intern", company: "SDN Communications (Telecom)", years: "2020 — 2020", text: "Built automated Power BI and Excel reporting models for executive decision-making and operational performance tracking." },
  ],

  // Corporate projects first, the independent one last.
  projects: [
    { name: "FY25 Origin Drayage RFQ", company: "HP Inc.", year: "2025", text: "Supported operational onboarding across 44 factory-to-port routes and 51,000 containers; built consolidated tracking files, standardized operational SOPs, and managed system freeze alignment." },
    { name: "Project Sequoia (HP Dimension with Google Beam)", company: "HP Inc.", year: "In progress", text: "Coordinated manufacturer onboarding and cross-functional readiness across ocean/air logistics, defect tracking, and UAT cutover sign-offs." },
    { name: "Vendor Account Migration & Systems Integration", company: "HP Inc.", year: "In progress", text: "Managing migration of vendor shipping accounts across enterprise ERP and external partner IT systems ahead of scheduled system freeze cutovers." },
    { name: "Meeting Documentation Automation", company: "HP Inc.", year: "2026", text: "Built an end-to-end meeting intelligence pipeline using Power Automate and Copilot Studio. Transcribes Teams calls into structured executive summaries, action items, and RAID updates, incorporating human-in-the-loop approval cards before auto-routing logs to OneNote." },
    { name: "AI-Assisted Trade Compliance Classification Agent", company: "Independent Project", year: "2026", text: "Architected an AI classification pipeline featuring confidence-based routing that auto-approves high-confidence records and escalates edge cases for human review. Designed an independent validation framework with falsification safeguards, maintaining 100% safety compliance across an 80-case evaluation set." },
  ],

  // text: an optional description line under the degree
  education: [
    { degree: "MSc Innovation Project Management", school: "UCT Prague", years: "2024 — Present", text: "Coursework complete. Master’s thesis on assessing project complexity in IS implementation projects. Available full-time." },
    { degree: "BBA Business Administration", school: "Augustana University", years: "2018 — 2022", text: "Focus on business management, operational systems, and organizational workflows." },
  ],
};
