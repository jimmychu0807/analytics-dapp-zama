// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

uint16 constant TXT_MAX_LEN = 512;

library QuestionSpecLib {
    enum QuestionType {
        Option,
        Value
    }

    struct QuestionSpec {
        string text;
        string[] options;
        uint32 min;
        uint32 max;
        QuestionType t;
    }

    error InvalidQuestionSpecParam(string reason);

    function validate(QuestionSpec memory self) public pure {
        if (bytes(self.text).length > TXT_MAX_LEN) revert InvalidQuestionSpecParam("questionText max length exceeded");
        if (self.t == QuestionType.Option && self.options.length < 2)
            revert InvalidQuestionSpecParam("Options should be greater than 1");
        if (self.min >= self.max) revert InvalidQuestionSpecParam("min should be less than max");
    }
}
