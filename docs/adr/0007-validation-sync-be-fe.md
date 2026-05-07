# ADR-0007: Validation sync BE (class-validator) + FE (Zod)

- **Status**: accepted
- **Date**: 2026-02-15
- **Tags**: validation, full-stack

## Context

Khi validation chi tai BE → user phai submit form roi moi biet loi → UX cham. Khi chi tai FE → attacker bypass qua API → insecure.

Can validation **2 lop** ma **rule dong bo**.

## Decision

### Backend: class-validator trong DTO
```typescript
export class CreateUserDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @MinLength(8, { message: 'Mat khau toi thieu 8 ky tu' })
  @Matches(/[A-Z]/, { message: 'Can it nhat 1 chu hoa' })
  @Matches(/[0-9]/, { message: 'Can it nhat 1 so' })
  @Matches(/[^a-zA-Z0-9]/, { message: 'Can it nhat 1 ky tu dac biet' })
  password: string;

  @Matches(/^(0|\+84)\d{9,10}$/, { message: 'SDT khong hop le (10-11 so)' })
  phone: string;

  @Length(2, 100, { message: 'Ten tu 2 den 100 ky tu' })
  name: string;
}
```

### Frontend: Zod schema song song
```typescript
export const createUserSchema = z.object({
  email: z.string().email('Email khong hop le'),
  password: z.string()
    .min(8, 'Mat khau toi thieu 8 ky tu')
    .regex(/[A-Z]/, 'Can it nhat 1 chu hoa')
    .regex(/[0-9]/, 'Can it nhat 1 so')
    .regex(/[^a-zA-Z0-9]/, 'Can it nhat 1 ky tu dac biet'),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, 'SDT khong hop le'),
  name: z.string().min(2).max(100),
});
```

### Uniform rules (enforced)
- Email: standard RFC
- Password: 8+ chars, 1 upper, 1 number, 1 special
- Phone: 10-11 digit VN format
- Name: 2-100 chars

### Message
- TIENG VIET (user VN)
- Rule tuong tu BE/FE → user khong confuse

## Rationale

- 2 lop: FE instant, BE final authority
- Rule giong = UX predictable (FE validate pass = BE pass, reduce surprise)
- Message tieng Viet = user-friendly

## Consequences

### Tich cuc
- UX tot: feedback instant
- Secure: BE la final gate
- Consistent: CLAUDE.md list rule, moi module follow

### Tieu cuc
- **Duplicate rules** BE + FE → maintenance cost
- Sync drift neu doi 1 ben quen ben kia

### Rui ro
- **Rule doi BE khong doi FE** → user pass FE, BE reject → mitigation: CI check co the so sanh key rule

## Alternatives Considered

### Share validator library (Zod used ca 2)
- **Uu**: 1 source of truth
- **Nhuoc**: NestJS ecosystem dung class-validator, chuyen Zod = over-engineer

### Chi FE validate
- **Nhuoc**: INSECURE

### Chi BE validate
- **Nhuoc**: UX cham

### TRPC-style schema share
- **Uu**: 1 schema
- **Nhuoc**: lock-in tRPC, khong phai stack chosen

## Implementation Notes

- CLAUDE.md liet ke uniform rules
- Shared rules dong packages (TODO): `shared/validators/` re-use giua FE/BE

## References

- CLAUDE.md "Validation uniform" section
