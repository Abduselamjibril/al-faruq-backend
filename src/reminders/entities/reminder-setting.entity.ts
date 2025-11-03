// src/reminders/entities/reminder-setting.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum ReminderId {
  JUMUAH = 'JUMUAH',
  KHAMIS = 'KHAMIS',
}

@Entity()
export class ReminderSetting {
  @PrimaryColumn({
    type: 'enum',
    enum: ReminderId,
  })
  id: ReminderId;

  @Column({ default: false })
  isEnabled: boolean;

  @Column('text')
  message: string;

  @Column({
    comment: 'The time of day in HH:mm format (24-hour clock)',
    default: '12:00',
  })
  time: string;

  @Column({
    comment:
      'Cron-compatible day of the week (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)',
  })
  dayOfWeek: number;

  @Column({
    comment: 'Timezone identifier, e.g., "Africa/Addis_Ababa"',
    default: 'Africa/Addis_Ababa',
  })
  timeZone: string;
}