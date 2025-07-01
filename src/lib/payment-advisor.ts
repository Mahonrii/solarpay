/**
 * Generates payment advice based on the current financial situation.
 * This is a simplified utility function.
 * @param principalRemaining The amount of principal loan balance remaining.
 * @param overduePaymentsCount The number of payments currently overdue.
 * @param totalPenaltyOwed The total amount of penalties currently owed.
 * @returns A string containing advice for the user.
 */
export async function getPaymentAdvice(
  principalRemaining: number,
  overduePaymentsCount: number,
  totalPenaltyOwed: number
): Promise<string> {
  if (overduePaymentsCount > 0) {
    let advice = `You have ${overduePaymentsCount} overdue payment(s) `;
    if (totalPenaltyOwed > 0) {
      advice += `with ₱${totalPenaltyOwed.toFixed(2)} in penalties. `;
    } else {
      advice += `. `;
    }
    advice += `It's important to address these as soon as possible to avoid further penalties. Consider making a payment for the overdue amount(s) immediately. If you're facing difficulties, please contact us to discuss potential arrangements.`;
    return advice;
  }

  if (principalRemaining <= 0) {
    return "Congratulations! Your solar system payment plan is fully paid off. Thank you for your timely payments.";
  }

  if (principalRemaining < 20000) { // Example threshold
    return `You're doing great! With only ₱${principalRemaining.toFixed(2)} remaining on your balance, you're close to owning your solar system outright. Keep up the excellent work.`;
  }
  
  return `Your account is in good standing with a remaining balance of ₱${principalRemaining.toFixed(2)}. Continue making timely payments to ensure a smooth completion of your payment plan. Planning ahead for upcoming payments is always a good strategy.`;
}
