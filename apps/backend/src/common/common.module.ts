import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [EncryptionService, EmailService],
  exports: [EncryptionService, EmailService],
})
export class CommonModule {}
