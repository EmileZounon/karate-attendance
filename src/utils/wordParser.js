import mammoth from 'mammoth';

// Parse a .docx file and extract attendance data
export const parseWordDocument = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return parseAttendanceReport(result.value);
};

// Parse the raw text from an attendance report
const parseAttendanceReport = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  const students = [];
  const studentStats = {};
  let inStudentTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Student Statistics section
    if (line.includes('Student Statistics') || (line.includes('Rank') && line.includes('Student'))) {
      inStudentTable = true;
      continue;
    }

    // End of Student Statistics section
    if (inStudentTable && (line.includes('Monthly Summary') || line.includes('Student Attendance by Month'))) {
      inStudentTable = false;
      continue;
    }

    // Parse student rows: "1 Varak 8 8 100.0%"
    if (inStudentTable) {
      const match = line.match(/^(\d+)\s+([A-Za-z]+)\s+(\d+)\s+(\d+)\s+([\d.]+)%?$/);
      if (match) {
        const [, , name, attended, total, percentage] = match;
        students.push(name);
        studentStats[name] = {
          attended: parseInt(attended),
          total: parseInt(total),
          percentage: parseFloat(percentage)
        };
      }
    }
  }

  // Extract month/year from title
  const monthMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  const month = monthMatch ? monthMatch[1] : null;
  const year = monthMatch ? monthMatch[2] : null;

  // Extract summary info
  const summaryMatch = text.match(/(\d+)\s+students?\s+enrolled.*?(\d+)\s+classes?\s+held/is);
  const totalStudents = summaryMatch ? parseInt(summaryMatch[1]) : students.length;
  const totalClasses = summaryMatch ? parseInt(summaryMatch[2]) : 0;

  return {
    students,
    studentStats,
    totalStudents,
    totalClasses,
    month,
    year
  };
};

// Merge imported data with existing (adds new students)
export const mergeImportedData = (existingStudents, importedData) => {
  const merged = [...new Set([...existingStudents, ...importedData.students])];
  return merged;
};
