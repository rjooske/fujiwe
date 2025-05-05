declare const nominalIdentifier: unique symbol;
type Nominal<T, Identifier> = T & { [nominalIdentifier]: Identifier };

export type CourseId = Nominal<string, "CourseId">;
export type StudentId = Nominal<string, "StudentId">;
export type Email = Nominal<string, "Email">;
export type ModuleName = Nominal<string, "ModuleName">;

export type Course = {
  id: CourseId;
  name: string;
  expectedStudents: StudentId[];
  targetName: string;
};

export type Student = {
  id: StudentId;
  name: string;
  schoolEmail: Email;
  personalEmail: Email;
};

export type StudentInWrongCourse = Student & {
  registeredCourse: Course;
  expectedCourse: Course;
};

export type StudentInNoCourse = Student & {
  expectedCourse: Course;
};

export type StudentInUnknownCourse = Student & {
  unknownCourseId: CourseId;
};

export type StudentWithoutDetails = {
  id: StudentId;
  expectedCourse: Course;
};

export type RegistrationDiscrepancy = {
  studentsInWrongCourse: StudentInWrongCourse[];
  studentsInNoCourse: StudentInNoCourse[];
  studentsInUnknownCourse: StudentInUnknownCourse[];
  studentsWithoutDetails: StudentWithoutDetails[];
};

export function findRegistrationDiscrepancy(
  registeredCourseIds: Map<StudentId, CourseId>,
  students: Map<StudentId, Student>,
  courses: Map<CourseId, Course>,
): RegistrationDiscrepancy {
  const discrepancy: RegistrationDiscrepancy = {
    studentsInWrongCourse: [],
    studentsInNoCourse: [],
    studentsInUnknownCourse: [],
    studentsWithoutDetails: [],
  };

  for (const course of courses.values()) {
    for (const studentId of course.expectedStudents) {
      const student = students.get(studentId);
      if (student === undefined) {
        discrepancy.studentsWithoutDetails.push({
          id: studentId,
          expectedCourse: course,
        });
        continue;
      }

      const registeredCourseId = registeredCourseIds.get(studentId);
      if (registeredCourseId === undefined) {
        // Student hasn't registered any course
        discrepancy.studentsInNoCourse.push({
          ...student,
          expectedCourse: course,
        });
      } else if (registeredCourseId !== course.id) {
        // Student has registered the wrong course
        const registeredCourse = courses.get(registeredCourseId);
        if (registeredCourse === undefined) {
          discrepancy.studentsInUnknownCourse.push({
            ...student,
            unknownCourseId: registeredCourseId,
          });
        } else {
          discrepancy.studentsInWrongCourse.push({
            ...student,
            registeredCourse,
            expectedCourse: course,
          });
        }
      }
    }
  }

  return discrepancy;
}
