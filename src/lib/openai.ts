export const FINANCIAL_TUTOR_SYSTEM_PROMPT = 'You are a helpful financial tutor for students.';

export function getOpenAIClient() {
  return {
    chat: {
      respond: async (prompt: string) => {
        void prompt;
        return 'This is a stubbed response.';
      },
      completions: {
        create: async (args: unknown) => {
          void args;
          return {
            choices: [
              {
                message: { content: 'This is a stubbed completion.' },
              },
            ],
          };
        },
      },
    },
  };
}

export const EXAMPLE_TOPICS = [
  'Budgeting Basics',
  'Understanding Interest',
  'Saving vs Investing',
  'Credit Scores',
];
