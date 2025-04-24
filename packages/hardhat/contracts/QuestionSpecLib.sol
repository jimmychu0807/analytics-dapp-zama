// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

uint16 constant TXT_MAX_LEN = 512;

enum QuestionType {
    Option, // For example 1 - count on the options pollers choose
    Value // For example 2 - perform min,max,avg on the numeric ans people give
}

struct QuestionSpec {
    string text;
    string[] options;
    uint32 min;
    uint32 max;
    QuestionType t;
}

library QuestionSpecLib {
    error InvalidQuestionSpecParam(string reason);

    function validate(QuestionSpec memory self) public pure {
        if (bytes(self.text).length > TXT_MAX_LEN) revert InvalidQuestionSpecParam("questionText max length exceeded");
        if (self.t == QuestionType.Option && self.options.length < 2) revert InvalidQuestionSpecParam("Options should be greater than 1");
        if (self.min >= self.max) revert InvalidQuestionSpecParam("min should be less than max");
    }
}
