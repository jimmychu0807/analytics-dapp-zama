// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

uint16 constant TXT_MAX_LEN = 512;

/**
 * @title QuestionSpecLib
 * @dev This library defines the data structure of a Question in a Question set. It also provide
 *   a "method" to validate itself.
 */
library QuestionSpecLib {
    enum QuestionType {
        Option,
        Value
    }

    /// @title QuestionSpec
    struct QuestionSpec {
        /// @dev Question text
        string text;
        /// @dev A list of option texts
        string[] options;
        /// @dev The min value for this question
        uint32 min;
        /// @dev The max value for this question
        uint32 max;
        /// @dev Question type
        QuestionType t;
    }

    error InvalidQuestionSpecParam(string reason);

    /// @dev If the question type is `QuestionType.Option`, the object must contains a list of string
    ///   as options, and `min` be set to 0 and `max` to option length - 1.
    ///   If question type is `QuestionType.Value`, options must be empty.
    /// @param self The QuestionSpec (or Question) object
    function validate(QuestionSpec memory self) public pure {
        if (bytes(self.text).length > TXT_MAX_LEN) revert InvalidQuestionSpecParam("questionText max length exceeded");

        if (self.t == QuestionType.Option) {
            // QuestionType.Option type
            if (self.options.length < 2) revert InvalidQuestionSpecParam("Options should be greater than 1");
            if (self.min != 0) revert InvalidQuestionSpecParam("min must be 0 for Option type question");
            if (self.max != self.options.length - 1)
                revert InvalidQuestionSpecParam("max must be option length - 1 for Option type question");
        } else {
            // QuestionType.Value type
            if (self.options.length > 0)
                revert InvalidQuestionSpecParam("Options should be empty for Value type question");
            if (self.min > self.max) revert InvalidQuestionSpecParam("min should be less than or equal to max");
        }
    }
}
